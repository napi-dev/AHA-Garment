/**
 * Attendance Actions - v2
 * 
 * Changes from v1:
 * - Uses AttendanceStatus enum instead of hoursWorked
 * - 50 employees per page (server-side pagination)
 * - Save+lock mechanism per supervisor
 * - Only Owner and PMG can edit after lock
 * 
 * Based on §4.2 of the master plan.
 */

"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePageAccess, canControl } from "@/lib/auth/permissions-v2";
import { revalidatePath } from "next/cache";
import type { AttendanceStatus } from "@prisma/client";
import { toDayKey } from "@/lib/date-helper";

interface SaveAttendanceInput {
  date: string; // YYYY-MM-DD
  employeeId: string;
  status: AttendanceStatus;
}

interface BulkAttendanceInput {
  date: string;
  employeeIds: string[];
  status: AttendanceStatus;
}

/**
 * Save single attendance record
 * v2: Uses status enum, checks lock
 */
export async function saveAttendance(input: SaveAttendanceInput) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም - Not authenticated");
  
  requirePageAccess(session.user.role, "/attendance");
  
  const date = new Date(input.date + "T00:00:00Z");
  const employee = await db.employee.findUnique({
    where: { id: input.employeeId },
    include: { department: true },
  });
  
  if (!employee) throw new Error("ሰራተኛ አልተገኘም - Employee not found");
  
  // Check if user can control this employee's department
  if (session.user.role === "LINE_SUPERVISOR") {
    // Line supervisor can only mark own line
    const canMark = employee.lineNo !== null && 
                    employee.lineNo.toString() === session.user.employeeCode?.split("-")[1];
    if (!canMark) {
      throw new Error("የመዳረሻ ፍቃድ የለም - Can only mark own line");
    }
  } else if (session.user.role !== "ADMIN" && session.user.role !== "PRODUCTION_MANAGER") {
    throw new Error("የመዳረሻ ፍቃድ የለም - Access denied");
  }
  
  // Check if locked
  const existing = await db.attendance.findUnique({
    where: { employeeId_date: { employeeId: input.employeeId, date } },
  });
  
  if (existing?.lockedAt) {
    // Only Owner and PMG can edit after lock
    if (session.user.role !== "ADMIN" && session.user.role !== "PRODUCTION_MANAGER") {
      throw new Error("ተዘግቷል - Record is locked");
    }
    
    // Audit the change
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_ATTENDANCE_AFTER_LOCK",
        entity: "Attendance",
        entityId: existing.id,
        before: { status: existing.status },
        after: { status: input.status },
        reason: "Edited after lock by Owner/PMG",
      },
    });
  }
  
  await db.attendance.upsert({
    where: { employeeId_date: { employeeId: input.employeeId, date } },
    update: { 
      status: input.status,
      enteredById: session.user.id,
    },
    create: {
      employeeId: input.employeeId,
      date,
      status: input.status,
      enteredById: session.user.id,
    },
  });
  
  revalidatePath("/attendance");
  return { success: true };
}

/**
 * Bulk set attendance for multiple employees
 * v2: Per page or per department
 */
export async function bulkAttendance(input: BulkAttendanceInput) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  
  requirePageAccess(session.user.role, "/attendance");
  
  const date = new Date(input.date + "T00:00:00Z");
  
  // For each employee, check permissions and save
  for (const empId of input.employeeIds) {
    try {
      await saveAttendance({
        date: input.date,
        employeeId: empId,
        status: input.status,
      });
    } catch (error) {
      // Continue with others if one fails
      console.error(`Failed to save attendance for ${empId}:`, error);
    }
  }
  
  revalidatePath("/attendance");
  return { success: true, processed: input.employeeIds.length };
}

/**
 * Lock attendance for a supervisor on a date
 * v2: "አስቀምጥ" button on last page
 */
export async function lockAttendance(date: string) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  
  requirePageAccess(session.user.role, "/attendance");
  
  const dateObj = new Date(date + "T00:00:00Z");
  
  // Check if this supervisor already locked this date
  const existing = await db.attendanceSubmission.findUnique({
    where: { 
      date_supervisorId: { 
        date: dateObj, 
        supervisorId: session.user.id 
      } 
    },
  });
  
  if (existing) {
    throw new Error("ቀድሞ ተቆልፏል - Already locked for this date");
  }
  
  // For line supervisors, lock only their line's employees
  // For Owner/PMG, they can lock their entries (when helping)
  let employeesToLock: string[] = [];
  
  if (session.user.role === "LINE_SUPERVISOR") {
    // Get line number from user code (e.g., SUP-001 → line 1)
    const lineNo = parseInt(session.user.employeeCode?.split("-")[1] || "0");
    const employees = await db.employee.findMany({
      where: { lineNo, isActive: true },
      select: { id: true },
    });
    employeesToLock = employees.map(e => e.id);
  } else if (session.user.role === "PRODUCTION_MANAGER") {
    // PMG locks employees without a line (support staff)
    const employees = await db.employee.findMany({
      where: { lineNo: null, isActive: true },
      select: { id: true },
    });
    employeesToLock = employees.map(e => e.id);
  }
  
  // Lock all attendance records for these employees on this date
  await db.attendance.updateMany({
    where: {
      employeeId: { in: employeesToLock },
      date: dateObj,
    },
    data: {
      lockedAt: new Date(),
    },
  });
  
  // Create submission record
  await db.attendanceSubmission.create({
    data: {
      date: dateObj,
      supervisorId: session.user.id,
    },
  });
  
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "LOCK_ATTENDANCE",
      entity: "Attendance",
      entityId: date,
      after: { date, employeeCount: employeesToLock.length },
    },
  });
  
  revalidatePath("/attendance");
  return { success: true, locked: employeesToLock.length };
}

/**
 * Get attendance data with pagination (50 per page)
 * v2: Server-side pagination
 */
export async function getAttendancePage(params: {
  date: string;
  page?: number;
  departmentId?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  
  requirePageAccess(session.user.role, "/attendance");
  
  const page = params.page || 1;
  const pageSize = 50;
  const skip = (page - 1) * pageSize;
  const date = new Date(params.date + "T00:00:00Z");
  
  // Build filter based on role
  let employeeFilter: any = { isActive: true };
  
  if (session.user.role === "LINE_SUPERVISOR") {
    // Line supervisor sees only own line
    const lineNo = parseInt(session.user.employeeCode?.split("-")[1] || "0");
    employeeFilter.lineNo = lineNo;
  } else if (params.departmentId) {
    // Filter by department if specified
    employeeFilter.departmentId = params.departmentId;
  }
  
  // Get total count
  const totalCount = await db.employee.count({
    where: employeeFilter,
  });
  
  // Get page of employees with their attendance
  const employees = await db.employee.findMany({
    where: employeeFilter,
    skip,
    take: pageSize,
    orderBy: { serialNumber: "asc" },
    include: {
      department: { select: { nameAm: true } },
      job: { select: { nameAm: true } },
      attendances: {
        where: { date },
      },
    },
  });
  
  // Check if locked
  const isLocked = employees.length > 0 && 
                   employees[0].attendances[0]?.lockedAt !== null;
  
  return {
    employees: employees.map(emp => ({
      id: emp.id,
      serialNumber: emp.serialNumber,
      nameAm: emp.nameAm,
      departmentName: emp.department.nameAm,
      jobName: emp.job?.nameAm || "-",
      lineNo: emp.lineNo,
      status: emp.attendances[0]?.status || "PRESENT",
      isLocked: emp.attendances[0]?.lockedAt !== null,
    })),
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      hasNext: skip + pageSize < totalCount,
      hasPrev: page > 1,
    },
    isLocked,
  };
}

/**
 * Check if all pages have been opened (for lock validation)
 */
export async function checkAllPagesOpened(date: string): Promise<{
  complete: boolean;
  missingPages: number[];
}> {
  // This would track which pages the user has visited
  // For now, simplified: check if any attendance records exist
  const dateObj = new Date(date + "T00:00:00Z");
  
  const totalEmployees = await db.employee.count({
    where: { isActive: true },
  });
  
  const recordedCount = await db.attendance.count({
    where: { date: dateObj },
  });
  
  // If recorded count equals total, assume all pages were visited
  return {
    complete: recordedCount === totalEmployees,
    missingPages: [], // Would need session storage to track actual page visits
  };
}
