import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getPageAccess } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import { getEffectiveDate } from "@/lib/date-override/effective-date";
import { AttendanceGrid } from "./attendance-grid";
import { DatePicker } from "./date-picker";
import { Users, Calendar, CheckCircle2, Building2 } from "lucide-react";
import type { AttendanceStatus } from "@prisma/client";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  
  // Check page access
  const access = getPageAccess(session.user.role, "/attendance");
  if (access === "none") {
    redirect("/dashboard");
  }

  const params = await searchParams;

  const effectiveToday = await getEffectiveDate();
  effectiveToday.setUTCHours(0, 0, 0, 0);
  const dateStr = params.date ?? effectiveToday.toISOString().split("T")[0];
  const date = new Date(dateStr + "T00:00:00Z");
  const page = parseInt(params.page ?? "1", 10);
  const PAGE_SIZE = 50;

  // Check if attendance is locked for this date
  const isLocked = await db.attendanceSubmission.findFirst({
    where: { 
      date,
      supervisorId: session.user.id,
    },
  });

  // Load ALL employees with pagination
  const totalEmployees = await db.employee.count({
    where: { isActive: true },
  });

  // Get total present count across ALL employees for this date
  const totalPresentCount = await db.attendance.count({
    where: {
      date,
      status: "PRESENT",
      employee: { isActive: true },
    },
  });

  const employees = await db.employee.findMany({
    where: { isActive: true },
    orderBy: { serialNumber: "asc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      attendances: { where: { date } },
      job: { select: { nameAm: true } },
      department: { select: { nameAm: true } },
    },
  });

  const canEdit = !isLocked && (
    session.user.role === "ADMIN" ||
    session.user.role === "PRODUCTION_MANAGER" ||
    session.user.role === "LINE_SUPERVISOR"
  );

  const totalPages = Math.ceil(totalEmployees / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="erp-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
            <Users size={14} />
            <span>የሰው ኃይል ክትትል</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
            {am.attendance.title}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-ethiopic flex items-center gap-2">
            <Calendar size={14} className="text-slate-400" />
            <span>{formatAsEthDate(date)}</span>
            <span>·</span>
            <CheckCircle2 size={13} className="text-emerald-500" />
            <span className="font-semibold text-emerald-600">{totalPresentCount}</span>
            <span>ከ {totalEmployees} ሠራተኞች ተገኝተዋል</span>
            <span>·</span>
            <span className="text-slate-400">ገጽ {page}/{totalPages}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <DatePicker defaultValue={dateStr} />
        </div>
      </div>

      {/* Locked Banner */}
      {isLocked && (
        <div className="erp-card p-5 bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-500">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-purple-900 font-ethiopic text-base mb-1">
                ክትትሉ ተቆልፏል
              </h3>
              <p className="text-sm text-purple-800 font-ethiopic leading-relaxed">
                የዚህ ቀን ክትትል በ {isLocked.submittedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} ተቆልፏል። 
                ያስቀመጡትን መረጃ ማየት ይችላሉ ነገር ግን ማስተካከል አይቻልም።
              </p>
            </div>
          </div>
        </div>
      )}

      <AttendanceGrid
        employees={employees.map((e) => ({
          id: e.id,
          serialNumber: e.serialNumber,
          nameAm: e.nameAm,
          jobName: e.job?.nameAm ?? "—",
          departmentName: e.department.nameAm,
          attendance: e.attendances[0]
            ? {
                id: e.attendances[0].id,
                status: e.attendances[0].status,
              }
            : null,
        }))}
        date={dateStr}
        canEdit={canEdit}
        userId={session.user.id}
        isLineSupervisor={session.user.role === "LINE_SUPERVISOR"}
        currentPage={page}
        totalPages={totalPages}
      />
    </div>
  );
}
