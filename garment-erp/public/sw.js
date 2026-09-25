/**
 * Service Worker — minimal offline support for the garment ERP.
 *
 * Strategy:
 *   - App shell (HTML, CSS, JS) → Network-first with cache fallback
 *   - Static assets (fonts, icons) → Cache-first
 *   - API routes → Network-only (never cache sensitive data)
 *   - Offline page → Served from cache when network fails and page not cached
 */

const CACHE_NAME   = "garment-erp-v1";
const OFFLINE_URL  = "/offline";
const SHELL_URLS   = ["/", "/dashboard", "/offline"];
const STATIC_EXTS  = [".woff2", ".woff", ".ttf", ".png", ".svg", ".ico"];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(SHELL_URLS).catch(() => {
        // Shell pre-cache is best-effort — don't block install
      })
    )
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin, and API routes entirely
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  const ext = url.pathname.slice(url.pathname.lastIndexOf("."));

  // Static assets → cache-first
  if (STATIC_EXTS.includes(ext)) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached ?? fetchAndCache(request)
      )
    );
    return;
  }

  // Navigation (HTML) → network-first, offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // Everything else → network-first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});

async function fetchAndCache(request) {
  const response = await fetch(request);
  const cache    = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
}
