"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { OffenceLevel } from "@prisma/client";

/** Record a new offence and apply penalty automatically. */
export async function recordOffence(employeeId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "incentive:adjust");

  const level  = String(formData.get("level") ?? "FIRST") as OffenceLevel;
  const date   = new Date(String(formData.get("date") ?? new Date().toISOString().split("T")[0]) + "T00:00:00Z");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reason) throw new Error("ምክንያት ያስፈልጋል");

  const emp = await db.employee.findUnique({
    where: { id: employeeId },
    select: { departmentId: true },
  });
  if (!emp) throw new Error("ሠራተኛው አልተገኘም");

  const offence = await db.offence.create({
    data: {
      employeeId,
      departmentId: emp.departmentId,
      level,
      date,
      reason,
      recordedById: session.user.id,
    },
  });

  // Apply automatic penalty based on level
  if (level === "SECOND") {
    // Suspend incentive for 2 months (≈ 4 pay periods)
    const start = date;
    const end   = new Date(date);
    end.setMonth(end.getMonth() + 2);

    // Deactivate any existing suspension first
    await db.suspension.updateMany({
      where: { employeeId, isActive: true },
      data: { isActive: false },
    });

    await db.suspension.create({
      data: {
        employeeId,
        startDate:   start,
        endDate:     end,
        reason:      `2ኛ ጥፋት — ${reason}`,
        createdById: session.user.id,
      },
    });
  }

  if (level === "THIRD" || level === "FOURTH") {
    // Open an HR alert (notify Super Manager + Admin)
    const msg = `⚠️ HR ጉዳይ — ${level === "THIRD" ? "3ኛ" : "4ኛ"} ጥፋት\nምክንያት: ${reason}\nሠራተኛ: ${employeeId}`;
    
    await db.alert.create({
      data: {
        type: "HR_CASE",
        message: msg,
        reference: offence.id,
      },
    });

    // Send Telegram notification to manager and admin
    const { sendToManagerAndAdmin } = await import("@/lib/automation/telegram");
    await sendToManagerAndAdmin(msg);
  }

  await db.auditLog.create({
    data: {
      userId:    session.user.id,
      action:    "RECORD_OFFENCE",
      entity:    "Offence",
      entityId:  offence.id,
      after:     { employeeId, level, reason, date: date.toISOString() },
    },
  });

  revalidatePath(`/employees/${employeeId}/offences`);
  redirect(`/employees/${employeeId}/offences`);
}

/** Lift an active suspension early (Admin / Super Manager only). */
export async function liftSuspension(suspensionId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "locked_data:correct");

  const suspension = await db.suspension.findUnique({ where: { id: suspensionId } });
  if (!suspension) throw new Error("ታግዱ አልተገኘም");

  await db.suspension.update({
    where: { id: suspensionId },
    data:  { isActive: false, endDate: new Date() },
  });

  await db.auditLog.create({
    data: {
      userId:   session.user.id,
      action:   "LIFT_SUSPENSION",
      entity:   "Suspension",
      entityId: suspensionId,
      after:    { liftedAt: new Date().toISOString() },
      reason:   "ቀደምት ማንሳት",
    },
  });

  revalidatePath(`/employees/${suspension.employeeId}/offences`);
  redirect(`/employees/${suspension.employeeId}/offences`);
}
