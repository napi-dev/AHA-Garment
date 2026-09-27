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

export async function saveHourlyCounts(input: SaveCountsInput): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "counts:enter");

  const date = new Date(input.date);
  date.setHours(0, 0, 0, 0);

  // Block if day is closed
  const dayClose = await db.dayClose.findUnique({ where: { date } });
  if (dayClose) throw new Error("ቀኑ ተዘግቷል — ቁጥር ማስቀመጥ አይቻልም");

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
}

// ─── Close the day ────────────────────────────────────────────────────────────

export async function closeDay(dateStr: string, notes?: string): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "counts:verify");

  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);

  const existing = await db.dayClose.findUnique({ where: { date } });
  if (existing) throw new Error("ቀኑ ቀድሞ ተዘግቷል");

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
}
