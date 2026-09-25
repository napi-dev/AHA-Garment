/**
 * GET /api/cron/alerts
 *
 * Runs all alert checks. Called by an external scheduler (cron-job.org,
 * Vercel Cron, platform scheduler) once per day — typically at end of shift.
 *
 * Protected by WORKER_SECRET in Authorization header.
 *
 * Checks:
 *  1. Low-stock for every active material
 *  2. Delayed / overdue production orders
 *  3. Missing day-close (day not closed by agreed cutoff time)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAndSendLowStockAlert, checkDelayedOrders, checkMissingDayClose } from "@/lib/automation/alerts";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const secret     = process.env.WORKER_SECRET ?? "";

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  try {
    // 1. Low-stock checks for all active materials
    const materials = await db.material.findMany({ where: { isActive: true }, select: { id: true } });
    let lowStockFired = 0;
    for (const m of materials) {
      const before = await db.alert.count({ where: { type: "LOW_STOCK", reference: m.id, resolvedAt: null } });
      await checkAndSendLowStockAlert(m.id);
      const after  = await db.alert.count({ where: { type: "LOW_STOCK", reference: m.id, resolvedAt: null } });
      if (after > before) lowStockFired++;
    }
    results.lowStock = { checked: materials.length, fired: lowStockFired };

    // 2. Delayed orders
    await checkDelayedOrders();
    results.delayedOrders = "checked";

    // 3. Missing day-close
    await checkMissingDayClose();
    results.missingDayClose = "checked";

  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, ...results });
}
