"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPageAccess } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createEmployee(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  
  const access = getPageAccess(session.user.role, "/employees");
  if (access !== "full") throw new Error("ፈቃድ የለም");

  const nameAm = String(formData.get("nameAm") ?? "").trim();
  const nameEn = String(formData.get("nameEn") ?? "").trim() || null;
  const departmentId = String(formData.get("departmentId") ?? "");
  const jobId = String(formData.get("jobId") ?? "") || null;
  const lineNoStr = String(formData.get("lineNo") ?? "");
  const lineNo = lineNoStr ? parseInt(lineNoStr, 10) : null;
  const hiredAtStr = String(formData.get("hiredAt") ?? "");
  const hiredAt = hiredAtStr ? new Date(hiredAtStr + "T00:00:00Z") : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!nameAm || !departmentId) throw new Error("ስም እና ክፍል ያስፈልጋሉ");
  if (!jobId) throw new Error("ስራ መምረጥ ያስፈልጋል");

  // Auto-assign next serial number
  const maxSerial = await db.employee.aggregate({ _max: { serialNumber: true } });
  const nextSerial = (maxSerial._max.serialNumber ?? 0) + 1;

  // Auto-generate employee code EMP-001, EMP-002 …
  const employeeCode = `EMP-${String(nextSerial).padStart(3, "0")}`;

  const emp = await db.employee.create({
    data: { 
      nameAm, 
      nameEn, 
      departmentId, 
      jobId,
      lineNo,
      serialNumber: nextSerial, 
      employeeCode,
      hiredAt,
      notes,
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE_EMPLOYEE",
      entity: "Employee",
      entityId: emp.id,
      after: { nameAm, departmentId, jobId, lineNo, employeeCode },
    },
  });

  revalidatePath("/employees");
  redirect("/employees");
}

export async function updateEmployee(empId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  
  const access = getPageAccess(session.user.role, "/employees");
  if (access !== "full") throw new Error("ፈቃድ የለም");

  const nameAm = String(formData.get("nameAm") ?? "").trim();
  const nameEn = String(formData.get("nameEn") ?? "").trim() || null;
  const departmentId = String(formData.get("departmentId") ?? "");
  const jobId = String(formData.get("jobId") ?? "") || null;
  const lineNoStr = String(formData.get("lineNo") ?? "");
  const lineNo = lineNoStr ? parseInt(lineNoStr, 10) : null;
  const hiredAtStr = String(formData.get("hiredAt") ?? "");
  const hiredAt = hiredAtStr ? new Date(hiredAtStr + "T00:00:00Z") : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const isActive = formData.get("isActive") !== "false";

  const before = await db.employee.findUnique({ where: { id: empId } });
  await db.employee.update({
    where: { id: empId },
    data: { nameAm, nameEn, departmentId, jobId, lineNo, hiredAt, notes, isActive },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE_EMPLOYEE",
      entity: "Employee",
      entityId: empId,
      before: before ? { 
        nameAm: before.nameAm, 
        departmentId: before.departmentId,
        jobId: before.jobId,
        lineNo: before.lineNo,
        isActive: before.isActive 
      } : undefined,
      after: { nameAm, departmentId, jobId, lineNo, isActive },
    },
  });

  revalidatePath("/employees");
  redirect("/employees");
}

export async function deleteEmployee(empId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  
  // Only Admin can delete
  if (session.user.role !== "ADMIN") {
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
