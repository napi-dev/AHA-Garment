"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createEmployee(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "employees:edit");

  const nameAm = String(formData.get("nameAm") ?? "").trim();
  const nameEn = String(formData.get("nameEn") ?? "").trim() || null;
  const departmentId = String(formData.get("departmentId") ?? "");

  if (!nameAm || !departmentId) throw new Error("ስም እና ክፍል ያስፈልጋሉ");

  // Auto-assign next serial number
  const maxSerial = await db.employee.aggregate({ _max: { serialNumber: true } });
  const nextSerial = (maxSerial._max.serialNumber ?? 0) + 1;

  // Auto-generate employee code EMP-001, EMP-002 …
  const employeeCode = `EMP-${String(nextSerial).padStart(3, "0")}`;

  const emp = await db.employee.create({
    data: { nameAm, nameEn, departmentId, serialNumber: nextSerial, employeeCode },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE_EMPLOYEE",
      entity: "Employee",
      entityId: emp.id,
      after: { nameAm, departmentId, employeeCode },
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

export async function deleteEmployee(empId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  // Only Admin and Super Manager can delete
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_MANAGER") {
    throw new Error("ፈቃድ የለም");
  }

  const emp = await db.employee.findUnique({ where: { id: empId } });
  if (!emp) throw new Error("ሠራተኛ አልተገኘም");

  // Soft-delete: set inactive rather than hard delete to preserve history
  await db.employee.update({
    where: { id: empId },
    data: { isActive: false },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "DELETE_EMPLOYEE",
      entity: "Employee",
      entityId: empId,
      before: { nameAm: emp.nameAm, employeeCode: emp.employeeCode },
    },
  });

  revalidatePath("/employees");
}
