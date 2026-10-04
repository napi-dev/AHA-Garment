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
  searchParams: Promise<{ date?: string; dept?: string }>;
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

  // Check if attendance is locked for this date
  const isLocked = await db.attendanceSubmission.findFirst({
    where: { 
      date,
      supervisorId: session.user.id,
    },
  });

  // Load all dept names for the selector
  const allDepts = await db.department.findMany({
    where: { isActive: true, flowOrder: { not: null } }, // Only flow departments
    orderBy: { flowOrder: "asc" },
    select: { id: true, nameAm: true },
  });

  // Determine which dept to show
  const selectedDeptId = params.dept ?? allDepts[0]?.id ?? "";

  // Load selected department's employees + their attendance for this date
  const departments = selectedDeptId
    ? await db.department.findMany({
        where: { id: selectedDeptId, isActive: true },
        include: {
          employees: {
            where: { isActive: true },
            orderBy: { serialNumber: "asc" },
            include: {
              attendances: { where: { date } },
              job: { select: { nameAm: true } },
            },
          },
        },
      })
    : [];

  const canEdit = !isLocked && (
    session.user.role === "ADMIN" ||
    session.user.role === "PRODUCTION_MANAGER" ||
    session.user.role === "LINE_SUPERVISOR"
  );

  const totalEmployees = departments.reduce((acc, d) => acc + d.employees.length, 0);
  const totalPresent = departments.reduce(
    (acc, d) =>
      acc +
      d.employees.filter((e) => {
        const att = e.attendances[0];
        return att && att.status === "PRESENT";
      }).length,
    0
  );

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
            <span className="font-semibold text-emerald-600">{totalPresent}</span>
            <span>ከ {totalEmployees} ሠራተኞች ተገኝተዋል</span>
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

      {/* Department selector */}
      <div className="erp-card p-4">
        <form method="GET" className="flex flex-wrap items-center gap-3">
          {/* preserve date when switching dept */}
          <input type="hidden" name="date" value={dateStr} />
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 font-ethiopic">
            <Building2 size={14} className="text-blue-500" />
            <span>የስራ ክፍል ምረጥ፦</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allDepts.map((d) => (
              <button
                key={d.id}
                type="submit"
                name="dept"
                value={d.id}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-ethiopic transition-colors ${
                  d.id === selectedDeptId
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {d.nameAm}
              </button>
            ))}
          </div>
        </form>
      </div>

      <AttendanceGrid
        departments={departments.map((d) => ({
          id: d.id,
          nameAm: d.nameAm,
          employees: d.employees.map((e) => ({
            id: e.id,
            serialNumber: e.serialNumber,
            nameAm: e.nameAm,
            jobName: e.job?.nameAm ?? "—",
            attendance: e.attendances[0]
              ? {
                  id: e.attendances[0].id,
                  status: e.attendances[0].status,
                }
              : null,
          })),
        }))}
        date={dateStr}
        canEdit={canEdit}
        userId={session.user.id}
      />
    </div>
  );
}
