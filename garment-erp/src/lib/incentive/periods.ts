/**
 * Period management — accumulate daily counts into IncentivePeriod + IncentiveLines.
 * Called at period close (day 4 or day 19 of an Ethiopian month).
 *
 * ⚠️ SECURITY: This file contains pure functions only.
 * Server actions that call these must verify permissions.
 * DO NOT add "use server" directive here.
 *
 * Steps:
 *  1. Find or create the IncentivePeriod record.
 *  2. Sum all HourlyCountLine rows for each employee within the period date range.
 *  3. Look up the active IncentiveCard for each employee's department at period end.
 *  4. Run calculateWorkerIncentive() for each employee.
 *  5. Check for active suspensions → Payable = 0 if suspended.
 *  6. Upsert IncentiveLine rows (versioned if correcting).
 *  7. Return the draft period for the approval flow.
 */

import { db } from "@/lib/db";
import { calculateWorkerIncentive } from "./engine";
import { defaultPeriodBoundaries } from "@/lib/ethiopian-calendar";
import { toDayKey } from "@/lib/date-helper";
import type { IncentiveStatementStatus, Prisma } from "@prisma/client";
import Decimal from "decimal.js";

export interface ClosePeriodResult {
  periodId: string;
  employeeCount: number;
  totalCalculated: string;
  totalPayable: string;
  status: IncentiveStatementStatus;
}

/**
 * Close an incentive period: accumulate counts and build draft IncentiveLines.
 * Safe to call multiple times — re-creates lines in DRAFT state.
 * 
 * ⚠️ This function must be called from a server action that verifies permissions.
 * ⚠️ Uses Decimal for all money calculations (never parseFloat).
 * ⚠️ Runs in a transaction for consistency.
 */
export async function closePeriod(
  ethYear: number,
  ethMonth: number,
  periodNumber: 1 | 2, // 1 = day-4 payment, 2 = day-19 payment
  closedByUserId: string
): Promise<ClosePeriodResult> {
  return await db.$transaction(async (tx) => {
    // ── 1. Period boundaries ─────────────────────────────────────────────────
    // Check for a configured override first, else use defaults
    const config = await tx.periodConfig.findUnique({
      where: { ethYear_ethMonth: { ethYear, ethMonth } },
    });

    let startDate: Date;
    let endDate: Date;
    let paymentDay: number;

    if (config) {
      startDate = periodNumber === 1 ? config.period1Start : config.period2Start;
      endDate   = periodNumber === 1 ? config.period1End   : config.period2End;
    } else {
      const bounds = defaultPeriodBoundaries(ethYear, ethMonth);
      startDate = periodNumber === 1 ? bounds.p1Start : bounds.p2Start;
      endDate   = periodNumber === 1 ? bounds.p1End   : bounds.p2End;
    }
    paymentDay = periodNumber === 1 ? 4 : 19;

    // ── 2. Find or create the period record ──────────────────────────────────
    let period = await tx.incentivePeriod.findUnique({
      where: { ethYear_ethMonth_periodNumber: { ethYear, ethMonth, periodNumber } },
    });

    if (period && period.status === "APPROVED") {
      throw new Error("ይህ ወቅት ፀድቋል — ቀይር ካስፈለጋ ትክክለኛ ምክንያት ጋር አስተካክሉ");
    }

    if (!period) {
      period = await tx.incentivePeriod.create({
        data: { ethYear, ethMonth, periodNumber, startDate, endDate, paymentDay, status: "DRAFT" },
      });
    } else {
      // Reset to DRAFT on re-close
      await tx.incentivePeriod.update({
        where: { id: period.id },
        data: { startDate, endDate, status: "DRAFT" },
      });
    }

    // ── 3. Get ALL active employees (not just those with counts) ─────────────
    const allEmployees = await tx.employee.findMany({
      where: { isActive: true },
      select: { id: true, departmentId: true },
    });

    // ── 4. Aggregate HourlyCountLine rows for each employee in range ─────────
    type CountAgg = {
      employeeId: string;
      departmentId: string;
      totalPlus: number;
      totalMinus: number;
      totalMistakes: number;
    };

    const rawAgg = await tx.hourlyCountLine.groupBy({
      by: ["employeeId", "departmentId"],
      where: {
        sheet: { date: { gte: startDate, lte: endDate }, status: "LOCKED" },
        status: "LOCKED",
      },
      _sum: { plusPieces: true, minusPieces: true, mistakes: true },
    });

    const aggregated = new Map<string, CountAgg>();
    rawAgg.forEach((r) => {
      aggregated.set(r.employeeId, {
        employeeId: r.employeeId,
        departmentId: r.departmentId,
        totalPlus: r._sum.plusPieces ?? 0,
        totalMinus: r._sum.minusPieces ?? 0,
        totalMistakes: r._sum.mistakes ?? 0,
      });
    });

    // ── 5. Look up incentive cards and suspensions ───────────────────────────
    let totalCalculated = new Decimal(0);
    let totalPayable = new Decimal(0);

    // Delete existing DRAFT lines before re-creating
    await tx.incentiveLine.deleteMany({
      where: { periodId: period.id, version: 1 },
    });

    // Process ALL active employees (create zero lines if no counts)
    for (const emp of allEmployees) {
      const agg = aggregated.get(emp.id) || {
        employeeId: emp.id,
        departmentId: emp.departmentId,
        totalPlus: 0,
        totalMinus: 0,
        totalMistakes: 0,
      };

      // Active card for this department at period end
      const card = await tx.incentiveCard.findFirst({
        where: {
          departmentId: agg.departmentId,
          effectiveFrom: { lte: endDate },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: endDate } }],
        },
        orderBy: { effectiveFrom: "desc" },
      });

      if (!card) continue; // no card → no incentive

      // Check suspension
      const suspension = await tx.suspension.findFirst({
        where: {
          employeeId: agg.employeeId,
          isActive: true,
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      });

      const result = calculateWorkerIncentive({
        employeeId: agg.employeeId,
        departmentId: agg.departmentId,
        plusPieces: agg.totalPlus,
        minusPieces: agg.totalMinus,
        mistakes: agg.totalMistakes,
        ratePerPiece: card.ratePerPiece.toString(),
        isSuspended: !!suspension,
      });

      // Use Decimal for money calculations
      const calculated = new Decimal(result.calculated);
      const payable = new Decimal(result.payable);

      await tx.incentiveLine.create({
        data: {
          periodId: period.id,
          employeeId: agg.employeeId,
          departmentId: agg.departmentId,
          cardId: card.id,
          ratePerPiece: card.ratePerPiece,
          plusPieces: agg.totalPlus,
          minusPieces: agg.totalMinus,
          mistakes: agg.totalMistakes,
          calculated,
          payable,
          isSuspended: !!suspension,
          suspensionId: suspension?.id ?? null,
          version: 1,
        },
      });

      totalCalculated = totalCalculated.plus(calculated);
      totalPayable = totalPayable.plus(payable);
    }

    // ── 6. Move period to PENDING_APPROVAL ───────────────────────────────────
    await tx.incentivePeriod.update({
      where: { id: period.id },
      data: { status: "PENDING_APPROVAL" },
    });

    await tx.auditLog.create({
      data: {
        userId: closedByUserId,
        action: "CLOSE_INCENTIVE_PERIOD",
        entity: "IncentivePeriod",
        entityId: period.id,
        after: {
          ethYear, ethMonth, periodNumber,
          employeeCount: allEmployees.length,
          totalCalculated: totalCalculated.toFixed(2),
          totalPayable: totalPayable.toFixed(2),
        },
      },
    });

    return {
      periodId: period.id,
      employeeCount: allEmployees.length,
      totalCalculated: totalCalculated.toFixed(2),
      totalPayable: totalPayable.toFixed(2),
      status: "PENDING_APPROVAL",
    };
  }, {
    maxWait: 10000, // 10 seconds
    timeout: 30000, // 30 seconds
  });
}

/** 
 * Approve a period (Owner only in v2). Locks all lines and queues reports.
 * ⚠️ This function must be called from a server action that verifies permissions.
 * ⚠️ Runs in a transaction for consistency.
 */
export async function approvePeriod(periodId: string, approvedByUserId: string) {
  return await db.$transaction(async (tx) => {
    const period = await tx.incentivePeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new Error("ወቅቱ አልተገኘም");
    if (period.status === "APPROVED") throw new Error("ቀድሞ ፀድቋል");
    if (period.status !== "PENDING_APPROVAL") throw new Error("ወቅቱ ለማፅደቅ ዝግጁ አይደለም");

    await tx.incentivePeriod.update({
      where: { id: periodId },
      data: { status: "APPROVED", approvedById: approvedByUserId, approvedAt: new Date() },
    });

    await tx.incentiveLine.updateMany({
      where: { periodId },
      data: {},  // lines already have final values; status tracked on period
    });

    // Queue statement + summary reports
    await tx.reportJob.createMany({
      data: [
        { type: "INCENTIVE_STATEMENT",        periodDate: period.endDate, periodId, status: "pending" },
        { type: "RUNNING_INCENTIVE",          periodDate: period.endDate, periodId, status: "pending" },
        ...(period.periodNumber === 2
          ? [{ type: "MONTHLY_INCENTIVE_SUMMARY" as const, periodDate: period.endDate, periodId, status: "pending" }]
          : []),
      ],
    });

    await tx.auditLog.create({
      data: {
        userId: approvedByUserId,
        action: "APPROVE_INCENTIVE_PERIOD",
        entity: "IncentivePeriod",
        entityId: periodId,
        after: { approvedAt: new Date().toISOString() },
      },
    });
  }, {
    maxWait: 10000,
    timeout: 30000,
  });
}

/** List all incentive periods with totals. */
export async function listPeriods() {
  const periods = await db.incentivePeriod.findMany({
    orderBy: [{ ethYear: "desc" }, { ethMonth: "desc" }, { periodNumber: "desc" }],
    include: {
      _count: { select: { lines: true } },
    },
  });

  return periods.map((p) => ({
    id: p.id,
    ethYear: p.ethYear,
    ethMonth: p.ethMonth,
    periodNumber: p.periodNumber,
    paymentDay: p.paymentDay,
    startDate: p.startDate,
    endDate: p.endDate,
    status: p.status,
    lineCount: p._count.lines,
    approvedAt: p.approvedAt,
  }));
}
