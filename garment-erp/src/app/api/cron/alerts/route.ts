/**
 * GET /api/cron/alerts — DISABLED
 *
 * Cron-based alert generation has been removed.
 * Alerts are now triggered on-demand from the /alerts page
 * and inline after key events (day close, stock receive).
 */
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Cron endpoint removed. Use manual triggers from the app." },
    { status: 410 }
  );
}
