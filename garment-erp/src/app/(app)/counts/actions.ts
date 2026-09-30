"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";

// ─── Save hourly counts for a single worker ───────────────────────────────────

interface SaveCountsInput {
  date: string;         // ISO string
  employeeId: string;
  departmentId: string;
  supervisorId: string;
  hours: (number | null)[];  // 8 elements, null = absent that hour
  mistakes: number;
  mistakeReason: string | null;
  totalProduced: number;
  targetForDay: number;
  plusPieces: number;
  minusPieces: number;
}

export async function saveHourlyCounts(input: SaveCountsInput): Promise<{ ok: boolean; message: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ተፈቅዶ አልነበረም" };
  requirePermission(session.user.role, "counts:enter");

  const date = new Date(input.date);
  date.setHours(0, 0, 0, 0);

  // Block if day is closed
  const dayClose = await db.dayClose.findUnique({ where: { date } });
  if (dayClose) {
    return {
      ok: false,
      message: `ቀኑ ተዘግቷል (${new Date(dayClose.closedAt).toLocaleTimeString("en-ET", { hour: "2-digit", minute: "2-digit" })}) — ቁጥር ማስቀመጥ አይቻልም`,
    };
  }

  // Find or create the sheet for this date + operation
  // We use departmentId to find the operation mapping; if none, use a default
  const opMapping = await db.operationDeptMapping.findFirst({
    where: { departmentId: input.departmentId },
    include: { operation: true },
  });

  let operationId: string;
  if (opMapping) {
    operationId = opMapping.operationId;
  } else {
    // Create/find an "Unmapped" operation
    const unmapped = await db.operation.upsert({
      where: { nameEn: "Unmapped" },
      update: {},
      create: { nameEn: "Unmapped", nameAm: "ያልተዛመደ", sortOrder: 99 },
    });
    operationId = unmapped.id;
  }

  // Upsert the sheet
  const sheet = await db.hourlyCountSheet.upsert({
    where: { date_operationId: { date, operationId } },
    update: {},
    create: {
      date,
      operationId,
      supervisorId: input.supervisorId,
      status: "DRAFT",
    },
  });

  const [h1, h2, h3, h4, h5, h6, h7, h8] = input.hours;

  // Upsert the count line
  await db.hourlyCountLine.upsert({
    where: { sheetId_employeeId: { sheetId: sheet.id, employeeId: input.employeeId } },
    update: {
      h1, h2, h3, h4, h5, h6, h7, h8,
      totalProduced: input.totalProduced,
      targetForDay: input.targetForDay,
      plusPieces: input.plusPieces,
      minusPieces: input.minusPieces,
      mistakes: input.mistakes,
      mistakeReason: input.mistakeReason,
      status: "SUBMITTED",
      enteredById: session.user.id,
    },
    create: {
      sheetId: sheet.id,
      employeeId: input.employeeId,
      departmentId: input.departmentId,
      h1, h2, h3, h4, h5, h6, h7, h8,
      totalProduced: input.totalProduced,
      targetForDay: input.targetForDay,
      plusPieces: input.plusPieces,
      minusPieces: input.minusPieces,
      mistakes: input.mistakes,
      mistakeReason: input.mistakeReason,
      status: "SUBMITTED",
      enteredById: session.user.id,
    },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "SAVE_HOURLY_COUNT",
      entity: "HourlyCountLine",
      entityId: input.employeeId,
      after: {
        date: input.date,
        totalProduced: input.totalProduced,
        plusPieces: input.plusPieces,
        minusPieces: input.minusPieces,
      },
      actedAsManager: ["ADMIN", "SUPER_MANAGER", "PRODUCTION_MANAGER"].includes(session.user.role),
    },
  });

  revalidatePath("/counts");
  revalidatePath("/dashboard");
}

// ─── Verify a count line (Production Manager) ────────────────────────────────

export async function verifyCountLine(lineId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "counts:verify");

  const line = await db.hourlyCountLine.findUnique({ where: { id: lineId } });
  if (!line) throw new Error("ቁጥሩ አልተገኘም");
  if (line.status === "LOCKED") throw new Error("ቁጥሩ ተቆልፏል");

  // Update the line status; verifiedById is tracked on HourlyCountSheet
  await db.hourlyCountLine.update({
    where: { id: lineId },
    data: { status: "VERIFIED" },
  });

  // Also mark the sheet as verified by this user
  if (line.sheetId) {
    await db.hourlyCountSheet.update({
      where: { id: line.sheetId },
      data: { verifiedById: session.user.id, verifiedAt: new Date() },
    });
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "VERIFY_COUNT",
      entity: "HourlyCountLine",
      entityId: lineId,
      after: { status: "VERIFIED" },
    },
  });

  revalidatePath("/counts");
  return { ok: true, message: "ተቀምጧል" };
}

// ─── Close the day ────────────────────────────────────────────────────────────

export async function closeDay(dateStr: string, notes?: string): Promise<{ ok: boolean; message: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ተፈቅዶ አልነበረም" };
  requirePermission(session.user.role, "counts:verify");

  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);

  const existing = await db.dayClose.findUnique({ where: { date } });
  if (existing) {
    return {
      ok: false,
      message: `ይህ ቀን ቀድሞ ተዘግቷል — ${new Date(existing.closedAt).toLocaleTimeString("en-ET", { hour: "2-digit", minute: "2-digit" })}`,
    };
  }

  // Lock all sheets for this date
  const sheets = await db.hourlyCountSheet.findMany({ where: { date } });
  for (const sheet of sheets) {
    await db.hourlyCountSheet.update({
      where: { id: sheet.id },
      data: { status: "LOCKED", closedAt: new Date() },
    });
    await db.hourlyCountLine.updateMany({
      where: { sheetId: sheet.id, status: { not: "LOCKED" } },
      data: { status: "LOCKED" },
    });
  }

  // Create day close record
  const dayClose = await db.dayClose.create({
    data: { date, closedById: session.user.id, notes },
  });

  // Queue report jobs
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

// ─── Generate daily PDF report and send to Telegram ──────────────────────────

export async function generateAndSendDailyReport(dateStr: string): Promise<{ ok: boolean; message: string }> {
  "use server";
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ተፈቅዶ አልነበረም" };
  requirePermission(session.user.role, "counts:verify");

  try {
    const date = new Date(dateStr);
    date.setUTCHours(0, 0, 0, 0);

    // Day boundaries for audit log query
    const dayEnd = new Date(date);
    dayEnd.setUTCHours(23, 59, 59, 999);

    // ── Fetch all data in parallel ──────────────────────────────────────────
    const [lines, auditLogs] = await Promise.all([
      db.hourlyCountLine.findMany({
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
      }),
      // Today's audit entries with user code
      db.auditLog.findMany({
        where: { createdAt: { gte: date, lte: dayEnd } },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { employeeCode: true } } },
      }),
    ]);

    // Build incentive card lookup
    const cardMap = new Map<string, number>();
    const deptIds = [...new Set(lines.map((l) => l.departmentId))];
    await Promise.all(
      deptIds.map(async (deptId) => {
        const card = await db.incentiveCard.findFirst({
          where: {
            departmentId: deptId,
            effectiveFrom: { lte: date },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
          },
          orderBy: { effectiveFrom: "desc" },
        });
        cardMap.set(deptId, card?.targetPerHour ?? 0);
      })
    );

    let totalProduced = 0;
    let aboveTarget   = 0;

    const rows = lines.map((line, idx) => {
      const targetPerHour = cardMap.get(line.departmentId) ?? 0;
      const targetPerDay  = targetPerHour * 8;
      totalProduced += line.totalProduced;
      if (line.plusPieces > 0) aboveTarget++;
      const pct = targetPerDay > 0
        ? Math.round((line.totalProduced / targetPerDay) * 100 * 10) / 10
        : 0;
      
      // Ensure all fields are strings or numbers, never null
      return {
        serial: idx + 1,
        nameAm: String(line.employee.nameAm ?? "—"),
        operationAm: String(line.sheet.operation.nameAm ?? "—"),
        machineType: String(line.department.nameEn ?? line.department.nameAm ?? "—"),
        targetPerDay,
        produced: line.totalProduced,
        plusPieces: line.plusPieces,
        minusPieces: line.minusPieces,
        percentOfTarget: pct,
      };
    });

    // Build audit rows for PDF page 2
    const auditRows = auditLogs.map((log) => {
      // Ensure every field is a string, never null/undefined
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

    // Defensive check: ensure all data is serializable and has no nulls
    console.log("[PDF DEBUG] rows count:", rows.length);
    console.log("[PDF DEBUG] auditRows count:", auditRows.length);
    console.log("[PDF DEBUG] Sample row:", rows[0]);
    console.log("[PDF DEBUG] Sample audit:", auditRows[0]);

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
      console.error("[PDF ERROR] Props:", { dateLabel, dateSlug, supervisorName: session.user.nameAm, rows: rows.length, auditRows: auditRows.length });
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
      await db.reportJob.upsert({
        where:  { type_periodDate: { type: "DAILY_PRODUCTION_SHEET", periodDate: date } },
        update: { status: allOk ? "sent" : "failed", attempts: { increment: 1 } },
        create: {
          type: "DAILY_PRODUCTION_SHEET",
          periodDate: date,
          status: allOk ? "sent" : "failed",
          dayCloseId: dayClose.id,
        },
      });
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
// Called once per month by Admin/Super Manager from the counts/close page.
// Keeps the current month's logs; deletes everything before that.

export async function purgeMonthlyAuditLog(): Promise<{ ok: boolean; message: string; deleted: number }> {
  "use server";
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ተፈቅዶ አልነበረም", deleted: 0 };
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_MANAGER") {
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
