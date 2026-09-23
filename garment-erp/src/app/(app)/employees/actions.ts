"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

export async function createEmployee(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "employees:edit");

  const nameAm = String(formData.get("nameAm") ?? "").trim();
  const nameEn = String(formData.get("nameEn") ?? "").trim() || null;
  const departmentId = String(formData.get("departmentId") ?? "");
  const createLogin = formData.get("createLogin") === "true";
  const employeeCode = String(formData.get("employeeCode") ?? "").trim().toUpperCase();
  const pin = String(formData.get("pin") ?? "").trim();
  const role = (formData.get("role") ?? "OPERATOR") as Role;

  if (!nameAm || !departmentId) throw new Error("ስም እና ክፍል ያስፈልጋሉ");

  // Get next serial
  const maxSerial = await db.employee.aggregate({ _max: { serialNumber: true } });
  const nextSerial = (maxSerial._max.serialNumber ?? 0) + 1;

  const emp = await db.employee.create({
    data: { nameAm, nameEn, departmentId, serialNumber: nextSerial },
  });

  if (createLogin && employeeCode && pin) {
    const pinHash = await bcrypt.hash(pin, 10);
    await db.appUser.create({
      data: {
        employeeCode,
        pinHash,
        role,
        employeeId: emp.id,
      },
    });
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE_EMPLOYEE",
      entity: "Employee",
      entityId: emp.id,
      after: { nameAm, departmentId },
    },
  });

  revalidatePath("/employees");
  redirect("/employees");
}

export async function updateEmployee(empId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "employees:edit");

  const nameAm = String(formData.get("nameAm") ?? "").trim();
  const nameEn = String(formData.get("nameEn") ?? "").trim() || null;
  const departmentId = String(formData.get("departmentId") ?? "");
  const isActive = formData.get("isActive") !== "false";

  const before = await db.employee.findUnique({ where: { id: empId } });
  await db.employee.update({
    where: { id: empId },
    data: { nameAm, nameEn, departmentId, isActive },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE_EMPLOYEE",
      entity: "Employee",
      entityId: empId,
      before: before ? { nameAm: before.nameAm, departmentId: before.departmentId, isActive: before.isActive } : undefined,
      after: { nameAm, departmentId, isActive },
    },
  });

  revalidatePath("/employees");
  redirect("/employees");
}
