"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, canViewSalary } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";

/** Set or update a fixed salary for an employee. */
export async function setSalary(input: {
  employeeId: string;
  amount: string; // ETB exact string e.g. "3500.00"
  effectiveFrom: string; // ISO date string
}) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "salary:edit");

  const effectiveFrom = new Date(input.effectiveFrom + "T00:00:00Z");

  // Close any currently-open salary record
  await db.salaryRecord.updateMany({
    where: { employeeId: input.employeeId, effectiveTo: null },
    data: { effectiveTo: effectiveFrom },
  });

  const record = await db.salaryRecord.create({
    data: {
      employeeId: input.employeeId,
      amount: input.amount,
      effectiveFrom,
      setByUserId: session.user.id,
    },
  });

  // Notify Super Manager if Admin made the change
  if (session.user.role === "ADMIN") {
    await db.alert.create({
      data: {
        type: "UNUSUAL_COUNT", // reusing for system notifications
        message: `Admin ${session.user.employeeCode} ደሞዝ ቀይሯል — ሠራተኛ ID: ${input.employeeId}. ጥቅምት ${input.amount} ብር ከ ${input.effectiveFrom}`,
        reference: record.id,
      },
    });
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "SET_SALARY",
      entity: "SalaryRecord",
      entityId: record.id,
      after: { employeeId: input.employeeId, amount: input.amount, effectiveFrom: input.effectiveFrom },
      actedAsManager: true,
    },
  });

  revalidatePath("/salary");
  revalidatePath(`/employees/${input.employeeId}/salary`);
}

/** Approve the monthly salary schedule (Super Manager only). */
export async function approveSalarySchedule(ethYear: number, ethMonth: number) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "salary_schedule:approve");

  // Queue a report job for the monthly salary schedule
  const periodDate = new Date();
  await db.reportJob.create({
    data: {
      type: "MONTHLY_SALARY_SCHEDULE",
      periodDate,
      status: "pending",
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "APPROVE_SALARY_SCHEDULE",
      entity: "SalarySchedule",
      entityId: `${ethYear}-${ethMonth}`,
      after: { ethYear, ethMonth, approvedAt: new Date().toISOString() },
    },
  });

  revalidatePath("/salary");
}
