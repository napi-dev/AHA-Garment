/**
 * GET /api/health
 *
 * Lightweight health check — verifies DB connectivity.
 * Used by:
 *  - Monitoring tools (uptime checks)
 *  - Client-side connectivity detection (tablets on factory floor)
 *  - Worker secret not required — intentionally public but returns minimal info.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { ok: true, db: "connected", ts: new Date().toISOString() },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, db: "error", error: e instanceof Error ? e.message : "unknown" },
      { status: 503 }
    );
  }
}
