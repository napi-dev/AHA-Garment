/**
 * /api/pdf/incentive/[id] — REMOVED
 *
 * Per requirement #10: PDF generation happens only from /counts/close.
 * The incentive statement PDF is now generated inline from the report worker
 * (src/lib/automation/report-worker.ts) after period approval.
 */
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Endpoint removed. Incentive PDFs are generated automatically after period approval." },
    { status: 410 }
  );
}
