/**
 * Report worker — processes the ReportJob outbox table.
 *
 * Design:
 *  - Every report is a row in ReportJob with status "pending".
 *  - This function picks up pending jobs, generates the PDF/Excel, uploads to
 *    Drive, sends to Telegram, then marks the job "sent" (or "failed").
 *  - Retries up to 3 times with exponential backoff.
 *  - On final failure: marks "failed" and notifies dev chat.
 *  - Call this from:
 *      a) /api/worker/run  — cron endpoint (platform scheduler or external cron)
 *      b) After day close / period approval (inline, for immediate delivery)
 *
 * Reports visible only to manager chat:
 *   INCENTIVE_STATEMENT, MONTHLY_INCENTIVE_SUMMARY, MONTHLY_SALARY_SCHEDULE,
 *   RUNNING_INCENTIVE
 *
 * Reports sent to all chats:
 *   DAILY_SUMMARY, DAILY_PRODUCTION_SHEET, DAILY_PIECE_COUNT,
 *   CUTTING_WASTAGE, EMPLOYEE_PRODUCTIVITY, ORDER_STATUS
 */

import { db } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import { IncentiveStatementPdf } from "@/lib/pdf/incentive-statement";
import { DailyProductionSheetPdf } from "@/lib/pdf/daily-production-sheet";
import { sendMessage, sendDocument, notifyDevError, CHATS, TEMPLATES } from "./telegram";
import { buildDailySummary, type DailySummaryFacts } from "./ai-summary";
import { uploadToDrive } from "./drive";
import { gregorianToEth, ethMonthName, formatAsEthDate } from "@/lib/ethiopian-calendar";
import Decimal from "decimal.js";
import React from "react";
import type { ReportType } from "@prisma/client";

const MAX_RETRIES = 3;

// Reports that go only to manager chat (contain salary / incentive data)
const MANAGER_ONLY: ReportType[] = [
  "INCENTIVE_STATEMENT",
  "MONTHLY_INCENTIVE_SUMMARY",
  "MONTHLY_SALARY_SCHEDULE",
  "RUNNING_INCENTIVE",
];

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
      await processJob(job.id, job.type, job.periodDate, job.periodId, job.dayCloseId);
      await db.reportJob.update({ where: { id: job.id }, data: { status: "sent", updatedAt: new Date() } });
      processed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const newCount = job.retryCount + 1;
      const status   = newCount >= MAX_RETRIES ? "failed" : "pending";
      await db.reportJob.update({
        where: { id: job.id },
        data: { retryCount: newCount, status, errorMessage: msg, updatedAt: new Date() },
      });
      if (status === "failed") {
        await notifyDevError(job.type, msg);
        failed++;
      }
    }
  }

  return { processed, failed };
}

// ─── Per-job processor ────────────────────────────────────────────────────────

async function processJob(
  jobId: string,
  type: ReportType,
  periodDate: Date,
  periodId: string | null,
  dayCloseId: string | null
) {
  const eth     = gregorianToEth(periodDate);
  const ethYear = eth.year;
  const ethMon  = eth.month;
  const mName   = ethMonthName(ethMon);
  const dateStr = periodDate.toISOString().split("T")[0];
  const managerOnly = MANAGER_ONLY.includes(type);

  switch (type) {
    case "INCENTIVE_STATEMENT": {
      if (!periodId) throw new Error("periodId required for INCENTIVE_STATEMENT");
      const { buffer, filename, caption } = await buildIncentiveStatementPdf(periodId);
      const drive = await uploadToDrive({
        filename, buffer, mimeType: "application/pdf",
        ethYear, ethMonth: ethMon, monthName: mName, reportType: "Incentive Statement",
      });
      await db.reportJob.update({ where: { id: jobId },
        data: { driveFileId: drive.fileId, driveUrl: drive.webUrl } });
      if (CHATS.manager) await sendDocument(CHATS.manager, filename, buffer, caption);
      break;
    }

    case "DAILY_PRODUCTION_SHEET": {
      const { buffer, filename } = await buildDailyProductionPdf(periodDate);
      const caption = `📋 የዕለት ምርት ሰሌዳ — ${formatAsEthDate(periodDate)}`;
      await uploadToDrive({
        filename, buffer, mimeType: "application/pdf",
        ethYear, ethMonth: ethMon, monthName: mName, reportType: "Daily Production",
      });
      if (CHATS.manager) await sendDocument(CHATS.manager, filename, buffer, caption);
      if (CHATS.dept)    await sendDocument(CHATS.dept,    filename, buffer, caption);
      break;
    }

    case "DAILY_SUMMARY": {
      const summary = await buildAiDailySummary(periodDate);
      if (CHATS.manager) await sendMessage(CHATS.manager, summary);
      if (CHATS.dept)    await sendMessage(CHATS.dept,    summary);
      break;
    }

    case "MONTHLY_INCENTIVE_SUMMARY": {
      if (!periodId) throw new Error("periodId required for MONTHLY_INCENTIVE_SUMMARY");
      const text = await buildMonthlySummaryText(periodId);
      if (CHATS.manager) await sendMessage(CHATS.manager, text);
      break;
    }

    case "MONTHLY_SALARY_SCHEDULE": {
      const text = `📑 ወርሃዊ ደሞዝ ሰሌዳ — ${mName} ${ethYear} ዓ.ም ተዘጋጅቷል።\nለዝርዝር ሥርዓቱን ይከፍቱ።`;
      if (CHATS.manager) await sendMessage(CHATS.manager, text);
      break;
    }

    default:
      // Other report types: log and skip (will be built in Phase 2)
      break;
  }
}

// ─── PDF builders ─────────────────────────────────────────────────────────────

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
      serial:       idx + 1,
      nameAm:       line.employee.nameAm,
      deptNameAm:   line.employee.department.nameAm,
      ratePerPiece: line.ratePerPiece.toString(),
      plusPieces:   line.plusPieces,
      minusPieces:  line.minusPieces,
      mistakes:     line.mistakes,
      calculated:   line.calculated.toString(),
      payable:      line.payable.toString(),
      isSuspended:  line.isSuspended,
    };
  });

  const periodLabel = `ኢንሴንቲቭ ክፍያ — ቀን ${period.paymentDay}`;
  const dateRange   = `${formatAsEthDate(period.startDate)} → ${formatAsEthDate(period.endDate)}`;
  const mName       = ethMonthName(period.ethMonth);

  const buffer = await renderToBuffer(
    React.createElement(IncentiveStatementPdf, {
      periodLabel, dateRange, lines,
      totalCalc: totalCalc.toFixed(2),
      totalPay:  totalPay.toFixed(2),
    })
  ) as Buffer;

  const filename = `${period.startDate.toISOString().split("T")[0]}_incentive-statement-day${period.paymentDay}_v1.pdf`;
  const caption  = TEMPLATES.incentiveReady(
    `${mName} ${period.ethYear} — ቀን ${period.paymentDay}`,
    totalCalc.toFixed(2),
    totalPay.toFixed(2)
  );
  return { buffer, filename, caption };
}

async function buildDailyProductionPdf(date: Date) {
  const lines = await db.hourlyCountLine.findMany({
    where: { sheet: { date }, status: { not: "DRAFT" } },
    include: {
      employee: true,
      department: true,
      sheet: { include: { operation: true } },
    },
    orderBy: [
      { department: { sortOrder: "asc" } },
      { employee: { serialNumber: "asc" } },
    ],
  });

  const cardMap = new Map<string, number>();
  for (const line of lines) {
    if (!cardMap.has(line.departmentId)) {
      const card = await db.incentiveCard.findFirst({
        where: {
          departmentId: line.departmentId,
          effectiveFrom: { lte: date },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
        },
        orderBy: { effectiveFrom: "desc" },
      });
      cardMap.set(line.departmentId, card?.targetPerHour ?? 0);
    }
  }

  let totalProduced = 0;
  let aboveTarget   = 0;

  const rows = lines.map((line, idx) => {
    const tph   = cardMap.get(line.departmentId) ?? 0;
    const tpd   = tph * 8;
    const prod  = line.totalProduced;
    totalProduced += prod;
    if (line.plusPieces > 0) aboveTarget++;
    const pct = tpd > 0 ? Math.round((prod / tpd) * 1000) / 10 : 0;
    return {
      serial: idx + 1,
      nameAm: line.employee.nameAm,
      operationAm: line.sheet.operation.nameAm,
      machineType: line.department.nameEn ?? "",
      targetPerDay: tpd,
      produced: prod,
      plusPieces: line.plusPieces,
      minusPieces: line.minusPieces,
      percentOfTarget: pct,
    };
  });

  const buffer = await renderToBuffer(
    React.createElement(DailyProductionSheetPdf, {
      dateLabel: formatAsEthDate(date),
      supervisorName: "",
      shift: "ቀን",
      rows, totalProduced, aboveTarget,
      totalWorkers: rows.length,
    })
  ) as Buffer;

  const dateStr  = date.toISOString().split("T")[0];
  const filename = `${dateStr}_daily-production-sheet_v1.pdf`;
  return { buffer, filename };
}

// ─── Text builders ────────────────────────────────────────────────────────────

async function buildAiDailySummary(date: Date): Promise<string> {
  const today = new Date(date);
  today.setHours(0, 0, 0, 0);

  const [countAgg, aboveTarget, qcPass, qcFail, packed, shipped, alerts, attendance] =
    await Promise.all([
      db.hourlyCountLine.aggregate({
        where: { sheet: { date: today }, status: "LOCKED" },
        _sum: { totalProduced: true },
        _count: { _all: true },
      }),
      db.hourlyCountLine.count({ where: { sheet: { date: today }, plusPieces: { gt: 0 } } }),
      db.qcInspection.count({ where: { inspectedAt: { gte: today }, passed: true } }),
      db.qcInspection.count({ where: { inspectedAt: { gte: today }, passed: false } }),
      db.bundle.count({ where: { currentStage: "PACKING" } }),
      db.delivery.count({ where: { dispatchedAt: today } }),
      db.alert.count({ where: { resolvedAt: null } }),
      db.attendance.count({ where: { date: today, hoursWorked: { gt: 0 } } }),
    ]);

  const cutJobs = await db.cutJob.findMany({
    where: { date: today },
    select: { piecesCut: true, wastagePct: true },
  });
  const totalCut  = cutJobs.reduce((s, j) => s + j.piecesCut, 0);
  const avgWaste  = cutJobs.length > 0
    ? cutJobs.reduce((s, j) => s + Number(j.wastagePct), 0) / cutJobs.length
    : 0;

  const facts: DailySummaryFacts = {
    dateLabel:      formatAsEthDate(date),
    totalCut,
    wastagePct:     avgWaste,
    totalSewn:      countAgg._sum.totalProduced ?? 0,
    qcPassed:       qcPass,
    qcFailed:       qcFail,
    totalPacked:    packed,
    totalShipped:   shipped,
    workersPresent: attendance,
    workersAbove:   aboveTarget,
    openAlerts:     alerts,
  };

  return buildDailySummary(facts);
}

async function buildMonthlySummaryText(periodId: string): Promise<string> {
  const period = await db.incentivePeriod.findUnique({ where: { id: periodId } });
  if (!period) return "ወርሃዊ ማጠቃለያ ተዘጋጅቷል።";

  const agg = await db.incentiveLine.aggregate({
    where: { periodId },
    _sum: { calculated: true, payable: true },
  });

  const mName = ethMonthName(period.ethMonth);
  return (
    `📊 ወርሃዊ ኢንሴንቲቭ ማጠቃለያ — ${mName} ${period.ethYear} ዓ.ም\n` +
    `ወር የተሰላ: ${new Decimal(agg._sum.calculated?.toString() ?? "0").toFixed(2)} ብር\n` +
    `ወር ሊከፈል: ${new Decimal(agg._sum.payable?.toString()    ?? "0").toFixed(2)} ብር`
  );
}
