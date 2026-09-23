/**
 * GET /api/worker/run
 *
 * Called by an external cron (platform scheduler, cron-job.org, etc.)
 * Protected by a shared secret in the Authorization header.
 *
 * Env: WORKER_SECRET — set to any strong random string.
 */

import { NextRequest, NextResponse } from "next/server";
import { processReportQueue } from "@/lib/automation/report-worker";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const secret     = process.env.WORKER_SECRET ?? "";

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processReportQueue();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
