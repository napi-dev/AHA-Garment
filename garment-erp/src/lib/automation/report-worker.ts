/**
 * report-worker.ts
 *
 * Lightweight report delivery — Telegram only, no Google Drive, no cron.
 * Called inline from server actions after day close / incentive approval.
 */

import { db } from "@/lib/db";
import { renderPdfToBuffer } from "@/lib/pdf/render";
import { IncentiveStatementPdf } from "@/lib/pdf/incentive-statement";
import { DailyProductionSheetPdf } from "@/lib/pdf/daily-production-sheet";
import { sendMessage, sendDocument, CHATS, TEMPLATES } from "./telegram";
import { gregorianToEth, ethMonthName, formatAsEthDate } from "@/lib/ethiopian-calendar";
import Decimal from "decimal.js";
import React from "react";
import type { ReportType } from "@prisma/client";

const MAX_RETRIES = 3;

export async function processReportQueue(): Promise<{ processed: number; failed: number }> {
  const jobs = await db.reportJob.findMany({
    where: { status: "pending", retryCount: { lt: MAX_RETRIES } },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  let processed = 0;
  let failed    = 0;

  for (const job of jobs) {
    try {
      await processJob(job.type, job.periodDate, job.periodId);
      await db.reportJob.update({
        where: { id: job.id },
        data:  { status: "sent", updatedAt: new Date() },
      });
      processed++;
    } catch (e) {
      const msg      = e instanceof Error ? e.message : String(e);
      const newCount = job.retryCount + 1;
      const status   = newCount >= MAX_RETRIES ? "failed" : "pending";
      await db.reportJob.update({
        where: { id: job.id },
        data:  { retryCount: newCount, status, errorMessage: msg, updatedAt: new Date() },
      });
      if (status === "failed") failed++;
    }
  }

  return { processed, failed };
}

// ─── Per-job processor ─────────────────────────────────────────────────────

async function processJob(type: ReportType, periodDate: Date, periodId: string | null) {
  switch (type) {
    case "INCENTIVE_STATEMENT": {
      if (!periodId) throw new Error("periodId required");
      const { buffer, filename, caption } = await buildIncentiveStatementPdf(periodId);
      if (CHATS.manager) await sendDocument(CHATS.manager, filename, buffer, caption);
      break;
    }
    case "DAILY_PRODUCTION_SHEET": {
      const { buffer, filename } = await buildDailyProductionPdf(periodDate);
      const caption = `📋 የዕለት ምርት ሰሌዳ — ${formatAsEthDate(periodDate)}`;
      if (CHATS.manager) await sendDocument(CHATS.manager, filename, buffer, caption);
      if (CHATS.dept)    await sendDocument(CHATS.dept,    filename, buffer, caption);
      break;
    }
    case "MONTHLY_INCENTIVE_SUMMARY": {
      if (!periodId) throw new Error("periodId required");
      const text = await buildMonthlySummaryText(periodId);
      if (CHATS.manager) await sendMessage(CHATS.manager, text);
      break;
    }
    default:
      // Other report types: skip silently
      break;
  }
}

// ─── PDF builders ─────────────────────────────────────────────────────────

async function buildIncentiveStatementPdf(periodId: string) {
  const period = await db.incentivePeriod.findUnique({
    where: { id: periodId },
    include: {
      lines: {
        include: { employee: { include: { department: true } } },
        orderBy: [
          { employee: { department: { sortOrder: "asc" } } },
          { employee: { serialNumber: "asc" } },
        ],
      },
    },
  });
  if (!period) throw new Error(`Period ${periodId} not found`);

  let totalCalc = new Decimal(0);
  let totalPay  = new Decimal(0);
  const lines = period.lines.map((line, idx) => {
    totalCalc = totalCalc.plus(line.calculated.toString());
    totalPay  = totalPay.plus(line.payable.toString());
    return {
      serial: idx + 1, nameAm: line.employee.nameAm,
      deptNameAm: line.employee.department.nameAm,
      ratePerPiece: line.ratePerPiece.toString(),
      plusPieces: line.plusPieces, minusPieces: line.minusPieces,
      mistakes: line.mistakes,
      calculated: line.calculated.toString(), payable: line.payable.toString(),
      isSuspended: line.isSuspended,
    };
  });

  const periodLabel = `ኢንሴንቲቭ ክፍያ — ቀን ${period.paymentDay}`;
  const dateRange   = `${formatAsEthDate(period.startDate)} → ${formatAsEthDate(period.endDate)}`;
  const buffer = await renderPdfToBuffer(
    React.createElement(IncentiveStatementPdf, {
      periodLabel, dateRange, lines,
      totalCalc: totalCalc.toFixed(2), totalPay: totalPay.toFixed(2),
    })
  );
  const filename = `${period.startDate.toISOString().split("T")[0]}_incentive-day${period.paymentDay}.pdf`;
  const caption  = TEMPLATES.incentiveReady(
    `${ethMonthName(period.ethMonth)} ${period.ethYear} — ቀን ${period.paymentDay}`,
    totalCalc.toFixed(2), totalPay.toFixed(2)
  );
  return { buffer, filename, caption };
}

async function buildDailyProductionPdf(date: Date) {
  const lines = await db.hourlyCountLine.findMany({
    where: { sheet: { date }, status: { not: "DRAFT" } },
    include: { employee: true, department: true, sheet: { include: { operation: true } } },
    orderBy: [{ department: { sortOrder: "asc" } }, { employee: { serialNumber: "asc" } }],
  });

  const cardMap = new Map<string, number>();
  for (const line of lines) {
    if (!cardMap.has(line.departmentId)) {
      const card = await db.incentiveCard.findFirst({
        where: { departmentId: line.departmentId, effectiveFrom: { lte: date },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }] },
        orderBy: { effectiveFrom: "desc" },
      });
      cardMap.set(line.departmentId, card?.targetPerHour ?? 0);
    }
  }

  let totalProduced = 0, aboveTarget = 0;
  const rows = lines.map((line, idx) => {
    const tpd = (cardMap.get(line.departmentId) ?? 0) * 8;
    totalProduced += line.totalProduced;
    if (line.plusPieces > 0) aboveTarget++;
    return {
      serial: idx + 1, nameAm: line.employee.nameAm,
      operationAm: line.sheet.operation.nameAm, machineType: line.department.nameEn ?? "",
      targetPerDay: tpd, produced: line.totalProduced,
      plusPieces: line.plusPieces, minusPieces: line.minusPieces,
      percentOfTarget: tpd > 0 ? Math.round((line.totalProduced / tpd) * 1000) / 10 : 0,
    };
  });

  const buffer = await renderPdfToBuffer(
    React.createElement(DailyProductionSheetPdf, {
      dateLabel: formatAsEthDate(date),
      dateFilename: date.toISOString().split("T")[0].replace(/\//g, "-"),
      supervisorName: "",
      shift: "ቀን",
      rows,
      totalProduced,
      aboveTarget,
      totalWorkers: rows.length,
      auditRows: [],
    })
  );
  return { buffer, filename: `${date.toISOString().split("T")[0]}_daily-production.pdf` };
}

async function buildMonthlySummaryText(periodId: string) {
  const period = await db.incentivePeriod.findUnique({ where: { id: periodId } });
  if (!period) return "ወርሃዊ ማጠቃለያ ተዘጋጅቷል።";
  const agg = await db.incentiveLine.aggregate({
    where: { periodId },
    _sum: { calculated: true, payable: true },
  });
  return (
    `📊 ወርሃዊ ኢንሴንቲቭ — ${ethMonthName(period.ethMonth)} ${period.ethYear} ዓ.ም\n` +
    `የተሰላ: ${new Decimal(agg._sum.calculated?.toString() ?? "0").toFixed(2)} ብር\n` +
    `ሊከፈል: ${new Decimal(agg._sum.payable?.toString() ?? "0").toFixed(2)} ብር`
  );
}
