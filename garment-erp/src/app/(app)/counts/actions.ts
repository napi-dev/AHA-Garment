"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requirePageAccess } from "@/lib/auth/permissions-v2";

// ─── Save hourly box for a single worker ─────────────────────────────────────

interface SaveHourlyBoxInput {
  date: string;         // ISO string YYYY-MM-DD
  employeeId: string;
  jobId: string;        // v2: points to Job (not Department)
  supervisorId: string;
  hours: (number | null)[];  // 8 elements, null = absent that hour
  mistakes: number;
  mistakeReason: string | null;
  totalProduced: number;
  targetForDay: number;
  plusPieces: number;
  minusPieces: number;
}

export async function saveHourlyBox(input: SaveHourlyBoxInput): Promise<{ ok: boolean; message: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ተፈቅዶ አልነበረም" };
  
  // v2: check permission using new system
  const access = await requirePageAccess(session.user.role, "/counts/enter");
  if (!access.allowed) {
    return { ok: false, message: "ለዚህ ገጽ ፈቃድ የለዎትም" };
  }

  const date = new Date(input.date + "T00:00:00Z");

  // Block if day is closed
  const dayClose = await db.dayClose.findUnique({ where: { date } });
  if (dayClose) {
    return {
      ok: false,
      message: `ቀኑ ተዘግቷል (${new Date(dayClose.closedAt).toLocaleTimeString("en-ET", { hour: "2-digit", minute: "2-digit" })}) — ቁጥር ማስቀመጥ አይቻልም`,
    };
  }

  // Verify job exists and is active
  const job = await db.job.findUnique({
    where: { id: input.jobId },
    include: { department: true },
  });

  if (!job || !job.isActive) {
    return { ok: false, message: "የተመረጠው ስራ ንቁ አይደለም" };
  }

  const [h1, h2, h3, h4, h5, h6, h7, h8] = input.hours;

  // Upsert the hourly box
  await db.hourlyBox.upsert({
    where: {
      date_employeeId: {
        date,
        employeeId: input.employeeId,
      },
    },
    update: {
      jobId: input.jobId,
      h1, h2, h3, h4, h5, h6, h7, h8,
      totalProduced: input.totalProduced,
      targetForDay: input.targetForDay,
      plusPieces: input.plusPieces,
      minusPieces: input.minusPieces,
      mistakes: input.mistakes,
      mistakeReason: input.mistakeReason,
      supervisorId: input.supervisorId,
      updatedAt: new Date(),
    },
    create: {
      date,
      employeeId: input.employeeId,
      jobId: input.jobId,
      h1, h2, h3, h4, h5, h6, h7, h8,
      totalProduced: input.totalProduced,
      targetForDay: input.targetForDay,
      plusPieces: input.plusPieces,
      minusPieces: input.minusPieces,
      mistakes: input.mistakes,
      mistakeReason: input.mistakeReason,
      supervisorId: input.supervisorId,
    },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "SAVE_HOURLY_BOX",
      entity: "HourlyBox",
      entityId: input.employeeId,
      after: {
        date: input.date,
        jobId: input.jobId,
        totalProduced: input.totalProduced,
        plusPieces: input.plusPieces,
        minusPieces: input.minusPieces,
      },
      actedAsManager: ["ADMIN", "PRODUCTION_MANAGER", "ORDER_PLACER"].includes(session.user.role),
    },
  });

  revalidatePath("/counts");
  revalidatePath("/dashboard");
  
  return { ok: true, message: "ተቀምጧል" };
}

// ─── Close the day ────────────────────────────────────────────────────────────
// v2: simplified — no separate sheet locking, just lock HourlyBox records

export async function closeDay(dateStr: string, notes?: string): Promise<{ ok: boolean; message: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ተፈቅዶ አልነበረም" };
  
  const access = await requirePageAccess(session.user.role, "/counts/close");
  if (!access.allowed) {
    return { ok: false, message: "ለዚህ ገጽ ፈቃድ የለዎትም" };
  }

  const date = new Date(dateStr + "T00:00:00Z");

  const existing = await db.dayClose.findUnique({ where: { date } });
  if (existing) {
    return {
      ok: false,
      message: `ይህ ቀን ቀድሞ ተዘግቷል — ${new Date(existing.closedAt).toLocaleTimeString("en-ET", { hour: "2-digit", minute: "2-digit" })}`,
    };
  }

  // Use transaction to ensure atomicity
  const dayClose = await db.$transaction(async (tx) => {
    // Create day close record
    const dc = await tx.dayClose.create({
      data: { date, closedById: session.user.id, notes },
    });

    // Lock all hourly boxes for this date
    await tx.hourlyBox.updateMany({
      where: { date },
      data: { isLocked: true },
    });

    return dc;
  }, {
    maxWait: 10000,
    timeout: 30000,
  });

  // Queue report jobs (outside transaction for speed)
  const reportTypes = [
    "DAILY_PRODUCTION_SHEET",
    "DAILY_PIECE_COUNT",
    "RUNNING_INCENTIVE",
    "CUTTING_WASTAGE",
    "EMPLOYEE_PRODUCTIVITY",
    "ORDER_STATUS",
  ] as const;

  for (const type of reportTypes) {
    await db.reportJob.create({
      data: {
        type,
        periodDate: date,
        status: "pending",
        dayCloseId: dayClose.id,
      },
    });
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CLOSE_DAY",
      entity: "DayClose",
      entityId: dayClose.id,
      after: { date: dateStr, notes },
    },
  });

  revalidatePath("/counts");
  revalidatePath("/dashboard");
  return { ok: true, message: "ቀኑ ተዘግቷል" };
}

// ─── Reopen a closed day (Admin only) ────────────────────────────────────────
// v2: added this utility for emergency reopening

export async function reopenDay(dateStr: string, reason: string): Promise<{ ok: boolean; message: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ተፈቅዶ አልነበረም" };
  
  if (session.user.role !== "ADMIN") {
    return { ok: false, message: "ይህ ተግባር ለአድሚን ብቻ ነው" };
  }

  const date = new Date(dateStr + "T00:00:00Z");

  const dayClose = await db.dayClose.findUnique({ where: { date } });
  if (!dayClose) {
    return { ok: false, message: "ይህ ቀን ተዘግቶ አልነበረም" };
  }

  await db.$transaction(async (tx) => {
    // Delete the day close record
    await tx.dayClose.delete({ where: { id: dayClose.id } });

    // Unlock all hourly boxes for this date
    await tx.hourlyBox.updateMany({
      where: { date },
      data: { isLocked: false },
    });

    // Delete pending/failed report jobs
    await tx.reportJob.deleteMany({
      where: {
        dayCloseId: dayClose.id,
        status: { in: ["pending", "failed"] },
      },
    });
  }, {
    maxWait: 10000,
    timeout: 30000,
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "REOPEN_DAY",
      entity: "DayClose",
      entityId: dayClose.id,
      reason,
      after: { date: dateStr },
    },
  });

  revalidatePath("/counts");
  revalidatePath("/dashboard");
  return { ok: true, message: "ቀኑ ተከፈተ — አሁን ማስተካከል ይችላሉ" };
}

// ─── Generate daily PDF report and send to Telegram ──────────────────────────
// v2: updated to use HourlyBox and Job instead of HourlyCountLine and Department

export async function generateAndSendDailyReport(dateStr: string): Promise<{ ok: boolean; message: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ተፈቅዶ አልነበረም" };
  
  const access = await requirePageAccess(session.user.role, "/counts/close");
  if (!access.allowed) {
    return { ok: false, message: "ለዚህ ገጽ ፈቃድ የለዎትም" };
  }

  try {
    const date = new Date(dateStr + "T00:00:00Z");

    // Day boundaries for audit log query
    const dayEnd = new Date(date);
    dayEnd.setUTCHours(23, 59, 59, 999);

    // ── Fetch all data in parallel ──────────────────────────────────────────
    const [boxes, auditLogs] = await Promise.all([
      db.hourlyBox.findMany({
        where: { date },
        include: {
          employee: true,
          job: {
            include: { department: true },
          },
        },
        orderBy: [
          { job: { department: { sortOrder: "asc" } } },
          { employee: { serialNumber: "asc" } },
        ],
      }),
      // Today's audit entries with user code
      db.auditLog.findMany({
        where: { createdAt: { gte: date, lte: dayEnd } },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { employeeCode: true } } },
      }),
    ]);

    let totalProduced = 0;
    let aboveTarget   = 0;

    const rows = boxes.map((box, idx) => {
      totalProduced += box.totalProduced;
      if (box.plusPieces > 0) aboveTarget++;
      
      const pct = box.targetForDay > 0
        ? Math.round((box.totalProduced / box.targetForDay) * 100 * 10) / 10
        : 0;
      
      // Ensure all fields are strings or numbers, never null
      return {
        serial: idx + 1,
        nameAm: String(box.employee.nameAm ?? "—"),
        operationAm: String(box.job.department.nameAm ?? "—"),  // v2: department is flow stage
        machineType: String(box.job.nameAm ?? "—"),            // v2: job is actual work type
        targetPerDay: box.targetForDay,
        produced: box.totalProduced,
        plusPieces: box.plusPieces,
        minusPieces: box.minusPieces,
        percentOfTarget: pct,
      };
    });

    // Build audit rows for PDF page 2
    const auditRows = auditLogs.map((log) => {
      let timeStr = "—";
      try {
        const t = log.createdAt.toLocaleTimeString("en-ET", { hour: "2-digit", minute: "2-digit", hour12: true });
        timeStr = t ? String(t) : "—";
      } catch {
        timeStr = "—";
      }
      
      return {
        time:     timeStr,
        userCode: String(log.user?.employeeCode ?? "—"),
        action:   String(log.action ?? "—"),
        entity:   String(log.entity ?? "—"),
        entityId: String((log.entityId ?? "—").slice(0, 10)),
        reason:   String(log.reason ?? "—"),
      };
    });

    // ── Build Ethiopian date strings ────────────────────────────────────────
    const { formatAsEthDate, gregorianToEth } = await import("@/lib/ethiopian-calendar");
    const eth = gregorianToEth(date);
    const dateLabel  = formatAsEthDate(date);                            // "20/1/2019 ዓ.ም"
    const dateSlug   = `${eth.day}-${eth.month}-${eth.year}`;           // "20-1-2019"
    const filename   = `ዕለታዊ-ሪፖርት-${dateSlug}.pdf`;                   // Ethiopic filename

    // ── Generate PDF ────────────────────────────────────────────────────────
    const { renderPdfToBuffer } = await import("@/lib/pdf/render");
    const { DailyProductionSheetPdf } = await import("@/lib/pdf/daily-production-sheet");
    const React = await import("react");

    console.log("[PDF DEBUG] rows count:", rows.length);
    console.log("[PDF DEBUG] auditRows count:", auditRows.length);

    let buffer: Buffer;
    try {
      buffer = await renderPdfToBuffer(
        React.default.createElement(DailyProductionSheetPdf, {
          dateLabel: String(dateLabel),
          dateFilename: String(dateSlug),
          supervisorName: String(session.user.nameAm ?? "—"),
          shift: "ቀን",
          rows,
          totalProduced,
          aboveTarget,
          totalWorkers: rows.length,
          auditRows,
        })
      ) as Buffer;
    } catch (pdfError) {
      console.error("[PDF ERROR] Failed to render:", pdfError);
      throw pdfError;
    }

    // ── Send to Telegram ────────────────────────────────────────────────────
    const { sendDocument } = await import("@/lib/automation/telegram");
    const managerChatId = process.env.TELEGRAM_MANAGER_CHAT_ID ?? "";
    const deptChatId    = process.env.TELEGRAM_DEPT_GROUP_CHAT_ID ?? "";

    const caption = [
      `📊 የዕለት ምርት ሪፖርት`,
      `ቀን: ${dateLabel}`,
      `ጠቅላላ ምርት: ${totalProduced.toLocaleString()} ፍሬ`,
      `ሠራተኞች: ${rows.length}  |  ከዒላማ በላይ: ${aboveTarget}`,
      `የሥርዓት ምዝገቦች: ${auditRows.length}`,
    ].join("\n");

    const results = await Promise.allSettled([
      managerChatId
        ? sendDocument(managerChatId, filename, buffer, caption)
        : Promise.resolve({ ok: true }),
      deptChatId
        ? sendDocument(deptChatId, filename, buffer, caption)
        : Promise.resolve({ ok: true }),
    ]);

    const allOk = results.every((r) => r.status === "fulfilled" && (r.value as { ok: boolean }).ok);

    // Save report job record
    const dayClose = await db.dayClose.findUnique({ where: { date } });
    if (dayClose) {
      const existingJob = await db.reportJob.findFirst({
        where: {
          type: "DAILY_PRODUCTION_SHEET",
          periodDate: date,
        },
      });

      if (existingJob) {
        await db.reportJob.update({
          where: { id: existingJob.id },
          data: {
            status: allOk ? "sent" : "failed",
            retryCount: { increment: 1 },
          },
        });
      } else {
        await db.reportJob.create({
          data: {
            type: "DAILY_PRODUCTION_SHEET",
            periodDate: date,
            status: allOk ? "sent" : "failed",
            dayCloseId: dayClose.id,
          },
        });
      }
    }

    revalidatePath("/counts/close");
    return {
      ok: allOk,
      message: allOk
        ? `ሪፖርቱ (${filename}) ወደ Telegram ተልኳል ✓`
        : "ሪፖርቱ ተዘጋጅቷል — Telegram ላኪ ሊሳካ አልቻለም",
    };
  } catch (e) {
    console.error("[generateAndSendDailyReport]", e);
    return { ok: false, message: e instanceof Error ? e.message : "ስህተት ተፈጥሯል" };
  }
}

// ─── Purge audit logs older than the current month ───────────────────────────
// v2: no changes from v1, kept as-is

export async function purgeMonthlyAuditLog(): Promise<{ ok: boolean; message: string; deleted: number }> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ተፈቅዶ አልነበረም", deleted: 0 };
  
  if (session.user.role !== "ADMIN") {
    return { ok: false, message: "ለዚህ ተግባር ፈቃድ የለዎትም", deleted: 0 };
  }

  // Delete audit logs created before the 1st of the current Gregorian month
  const now   = new Date();
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));

  const { count } = await db.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  await db.auditLog.create({
    data: {
      userId:   session.user.id,
      action:   "PURGE_AUDIT_LOG",
      entity:   "AuditLog",
      entityId: "monthly-purge",
      after:    { deletedCount: count, cutoffDate: cutoff.toISOString() },
      reason:   "ወርሃዊ የምዝገባ ጽዳት",
    },
  });

  revalidatePath("/audit");
  return {
    ok: true,
    message: `${count} የሥርዓት ምዝገቦች ተሰርዘዋል (${cutoff.toLocaleDateString("en-ET")} በፊት የነበሩ)`,
    deleted: count,
  };
}
