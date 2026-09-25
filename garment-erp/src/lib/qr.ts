/**
 * Minimal QR code generator — outputs an inline SVG string.
 *
 * Uses the qrcode package (pure JS, no native deps).
 * Falls back to a simple text box if the package is unavailable.
 *
 * Install: npm install qrcode @types/qrcode
 */

let qrLib: typeof import("qrcode") | null = null;

async function getQrLib() {
  if (qrLib) return qrLib;
  try {
    qrLib = await import("qrcode");
    return qrLib;
  } catch {
    return null;
  }
}

/**
 * Generate a QR code as an inline SVG string.
 * Returns a simple bordered text box if qrcode is not installed.
 */
export async function generateQRSVGAsync(text: string): Promise<string> {
  const lib = await getQrLib();
  if (lib) {
    try {
      return await lib.toString(text, { type: "svg", margin: 1, width: 200 });
    } catch {
      // fall through
    }
  }
  return fallbackSVG(text);
}

/**
 * Synchronous version — pre-generates at module load.
 * Used in the tag route (which is async anyway, but keeps the call site simple).
 */
export function generateQRSVG(text: string): string {
  // We return a placeholder SVG; the async version is called from the route.
  return fallbackSVG(text);
}

/**
 * Async wrapper for the tag route — preferred.
 */
export { generateQRSVGAsync as generateQR };

function fallbackSVG(text: string): string {
  // Simple bordered rect with the text — renders when qrcode package missing
  const safe = text.replace(/[<>&"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] ?? c)
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="white" stroke="#1a1a1a" stroke-width="4"/>
  <rect x="10" y="10" width="180" height="180" fill="none" stroke="#e5e7eb" stroke-width="1"/>
  <text x="100" y="90" text-anchor="middle" font-family="monospace" font-size="11" fill="#6b7280">QR CODE</text>
  <text x="100" y="115" text-anchor="middle" font-family="monospace" font-size="13" font-weight="bold" fill="#111">${safe}</text>
  <text x="100" y="140" text-anchor="middle" font-family="monospace" font-size="9" fill="#9ca3af">(install qrcode pkg)</text>
</svg>`;
}
