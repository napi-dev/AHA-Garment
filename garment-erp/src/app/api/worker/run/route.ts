/**
 * GET /api/worker/run — DISABLED
 *
 * The automated report worker has been removed.
 * Reports are now generated on-demand via the "Generate PDF" button on /counts/close.
 * No Google Drive, no cron scheduler.
 */
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Worker endpoint removed. Generate reports from /counts/close." },
    { status: 410 }
  );
}
