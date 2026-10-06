"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";

export async function updateSetting(key: string, userId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "settings:manage");

  const value = String(formData.get("value") ?? "").trim();
  await db.appSetting.upsert({
    where: { key },
    update: { value, updatedBy: session.user.id },
    create: { key, value, updatedBy: session.user.id },
  });
  revalidatePath("/settings");
}

/** Generate a one-time 8-character code for Telegram linking. */
export async function generateTelegramCode(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");

  const userId = String(formData.get("userId") ?? session.user.id);

  // Generate random 8-char alphanumeric code
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  for (const byte of arr) code += chars[byte % chars.length];

  const key = `telegram_link_${code}`;

  // Store code → userId, expires conceptually (no TTL in Prisma; cron can clean up)
  await db.appSetting.upsert({
    where: { key },
    update: { value: userId, updatedBy: userId },
    create: { key, value: userId, updatedBy: userId },
  });

  revalidatePath("/settings");
}

/** Create a new Job under a Department */
export async function createJob(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "settings:manage");

  const departmentId = String(formData.get("departmentId") ?? "").trim();
  const nameAm = String(formData.get("nameAm") ?? "").trim();
  const nameEn = String(formData.get("nameEn") ?? "").trim() || null;
  const targetPerHour = parseInt(String(formData.get("targetPerHour") ?? "50"), 10) || 50;
  const ratePerPieceStr = String(formData.get("ratePerPiece") ?? "0.50").trim();
  const ratePerPiece = parseFloat(ratePerPieceStr) || 0.50;

  if (!departmentId || !nameAm) {
    throw new Error("የሥራ ክፍል እና የስራው ስም ያስፈልጋል (Department and Job name required)");
  }

  // Check unique name in department
  const existing = await db.job.findFirst({
    where: { departmentId, nameAm },
  });
  if (existing) {
    throw new Error(`በዚህ ክፍል ውስጥ '${nameAm}' የሚባል ስራ ቀድሞ አለ።`);
  }

  const maxSort = await db.job.aggregate({
    where: { departmentId },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxSort._max.sortOrder ?? 0) + 1;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Transaction to create Job and its initial IncentiveCard
  const job = await db.$transaction(async (tx) => {
    const newJob = await tx.job.create({
      data: {
        departmentId,
        nameAm,
        nameEn,
        sortOrder,
        isActive: true,
      },
    });

    await tx.incentiveCard.create({
      data: {
        jobId: newJob.id,
        targetPerHour,
        ratePerPiece,
        effectiveFrom: today,
        setByUserId: session.user.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_JOB",
        entity: "Job",
        entityId: newJob.id,
        after: { nameAm, nameEn, departmentId, targetPerHour, ratePerPiece },
      },
    });

    return newJob;
  });

  revalidatePath("/settings");
  revalidatePath("/settings/jobs");
  revalidatePath("/settings/incentive-card");
  revalidatePath("/employees/new");
  revalidatePath("/counts/enter");
}

/** Delete or Deactivate a Job */
export async function deleteJob(jobId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "settings:manage");

  const job = await db.job.findUnique({
    where: { id: jobId },
    include: {
      _count: {
        select: {
          employees: true,
          hourlyBoxes: true,
          incentiveLines: true,
        },
      },
    },
  });

  if (!job) throw new Error("ስራው አልተገኘም (Job not found)");

  const hasHistory =
    job._count.employees > 0 ||
    job._count.hourlyBoxes > 0 ||
    job._count.incentiveLines > 0;

  if (hasHistory) {
    // Cannot delete due to foreign keys and history; deactivate instead
    await db.job.update({
      where: { id: jobId },
      data: { isActive: false },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DEACTIVATE_JOB",
        entity: "Job",
        entityId: jobId,
        after: { isActive: false, reason: "Deactivated because historical records exist" },
      },
    });
  } else {
    // Fully clean to delete
    await db.$transaction(async (tx) => {
      await tx.incentiveCard.deleteMany({ where: { jobId } });
      await tx.job.delete({ where: { id: jobId } });
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DELETE_JOB",
          entity: "Job",
          entityId: jobId,
          before: { nameAm: job.nameAm, departmentId: job.departmentId },
        },
      });
    });
  }

  revalidatePath("/settings");
  revalidatePath("/settings/jobs");
  revalidatePath("/settings/incentive-card");
  revalidatePath("/employees/new");
  revalidatePath("/counts/enter");
}

/** Toggle Job active / inactive status */
export async function toggleJobStatus(jobId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "settings:manage");

  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("ስራው አልተገኘም");

  await db.job.update({
    where: { id: jobId },
    data: { isActive: !job.isActive },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: job.isActive ? "DEACTIVATE_JOB" : "ACTIVATE_JOB",
      entity: "Job",
      entityId: jobId,
      after: { isActive: !job.isActive },
    },
  });

  revalidatePath("/settings");
  revalidatePath("/settings/jobs");
  revalidatePath("/settings/incentive-card");
  revalidatePath("/employees/new");
  revalidatePath("/counts/enter");
}

/** Add a Garment Type to saved list */
export async function addGarmentType(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "settings:manage");

  const newType = String(formData.get("typeName") ?? "").trim();
  if (!newType) throw new Error("የልብስ ዓይነት ስም ያስፈልጋል");

  const existing = await db.appSetting.findUnique({ where: { key: "garment_types" } });
  let list: string[] = ["ቲ-ሸርት", "ትራክ ሱሪ", "ፖሎ ሸሚዝ", "ጃኬት", "ሆዲ"];
  if (existing?.value) {
    try {
      const parsed = JSON.parse(existing.value);
      if (Array.isArray(parsed)) list = parsed;
    } catch {}
  }

  if (!list.includes(newType)) {
    list.push(newType);
    await db.appSetting.upsert({
      where: { key: "garment_types" },
      update: { value: JSON.stringify(list), updatedBy: session.user.id },
      create: { key: "garment_types", value: JSON.stringify(list), updatedBy: session.user.id },
    });
  }

  revalidatePath("/settings");
  revalidatePath("/production/orders/new");
}

/** Remove a Garment Type from saved list */
export async function removeGarmentType(typeName: string) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "settings:manage");

  const existing = await db.appSetting.findUnique({ where: { key: "garment_types" } });
  let list: string[] = ["ቲ-ሸርት", "ትራክ ሱሪ", "ፖሎ ሸሚዝ", "ጃኬት", "ሆዲ"];
  if (existing?.value) {
    try {
      const parsed = JSON.parse(existing.value);
      if (Array.isArray(parsed)) list = parsed;
    } catch {}
  }

  list = list.filter((t) => t !== typeName);

  await db.appSetting.upsert({
    where: { key: "garment_types" },
    update: { value: JSON.stringify(list), updatedBy: session.user.id },
    create: { key: "garment_types", value: JSON.stringify(list), updatedBy: session.user.id },
  });

  revalidatePath("/settings");
  revalidatePath("/production/orders/new");
}

/** Update monthly attendance bonus */
export async function updateAttendanceBonus(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  if (session.user.role !== "ADMIN") throw new Error("ባለቤት (ADMIN) ብቻ ቦነስ ሊቀይር ይችላል");

  const bonusNum = parseFloat(String(formData.get("bonus") ?? "500"));
  if (isNaN(bonusNum) || bonusNum < 0) {
    throw new Error("ትክክለኛ የቦነስ መጠን ያስገቡ");
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await db.salarySetting.upsert({
    where: { id: "default" },
    update: {
      attendanceBonus: bonusNum,
      effectiveFrom: today,
      setByUserId: session.user.id,
    },
    create: {
      id: "default",
      attendanceBonus: bonusNum,
      effectiveFrom: today,
      setByUserId: session.user.id,
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE_ATTENDANCE_BONUS",
      entity: "SalarySetting",
      entityId: "default",
      after: { attendanceBonus: bonusNum },
    },
  });

  revalidatePath("/settings");
  revalidatePath("/salary");
}
