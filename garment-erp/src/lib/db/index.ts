import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Reuse the same instance across hot-reloads in dev
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

/**
 * Wake up Neon's free-tier database if it has auto-suspended.
 * Call this wrapper instead of db directly for the first query on cold start.
 * Retries once after a 3-second pause on P1001 (can't reach server) or P1017 (closed).
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === "P1001" || code === "P1017") {
      // Neon is waking up — wait and retry once
      await new Promise((r) => setTimeout(r, 4000));
      return await fn();
    }
    throw err;
  }
}
