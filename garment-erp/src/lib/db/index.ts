import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? [
            { level: "error",   emit: "stdout" },
            { level: "warn",    emit: "stdout" },
            // Uncomment to log slow queries (>2 s) in dev:
            // { level: "query", emit: "event" },
          ]
        : [{ level: "error", emit: "stdout" }],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

/**
 * Prisma singleton — one shared PrismaClient per Node process.
 * In development, the instance is attached to `global` to survive hot reloads.
 * In production, a new instance is created once per serverless cold start.
 */
export const db: PrismaClient =
  globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = db;
}

// ─── Neon / transient-error retry ────────────────────────────────────────────

const RETRYABLE_CODES = new Set([
  "P1001", // Can't reach database server
  "P1017", // Server closed the connection
  "P2024", // Connection pool timeout
]);

/**
 * withRetry<T>
 *
 * Wraps any Prisma call and retries once when Neon's free-tier cold-start
 * or a transient connection reset causes P1001 / P1017 / P2024.
 * The first retry waits 4 s to give Neon time to wake up.
 * A second retry is attempted 2 s later before re-throwing.
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (!RETRYABLE_CODES.has(code ?? "")) throw err;

      const delay = attempt === 0 ? 4000 : 2000;
      if (attempt < 2) {
        console.warn(
          `[db] Prisma ${code} on attempt ${attempt + 1} — retrying in ${delay}ms`
        );
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  // TypeScript: unreachable
  throw new Error("withRetry exhausted");
}

/**
 * safeQuery<T>
 *
 * Convenience wrapper that combines withRetry with a fallback value.
 * Use for non-critical secondary queries (badge counts, etc.) so a DB
 * blip on those queries doesn't crash the whole page.
 *
 * @example
 *   const count = await safeQuery(() => db.alert.count(...), 0);
 */
export async function safeQuery<T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await withRetry(fn);
  } catch {
    return fallback;
  }
}
