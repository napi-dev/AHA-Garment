import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import { getEffectiveDate } from "@/lib/date-override/effective-date";
import { AttendanceGrid } from "./attendance-grid";
import { DatePicker } from "./date-picker";
import { Users, Calendar, CheckCircle2 } from "lucide-react";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "attendance:view");

  const params = await searchParams;
  // Default to the effective date (respects admin override); user can override via date picker
  const effectiveToday = await getEffectiveDate();
  effectiveToday.setUTCHours(0, 0, 0, 0);
  const dateStr = params.date ?? effectiveToday.toISOString().split("T")[0];
  const date = new Date(dateStr + "T00:00:00Z");

  const departments = await db.department.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      employees: {
        where: { isActive: true },
        orderBy: { serialNumber: "asc" },
        include: {
          attendances: {
            where: { date },
          },
        },
      },
    },
  });

  const canEdit =
    session.user.role === "ADMIN" ||
    session.user.role === "SUPER_MANAGER" ||
    session.user.role === "HR_CLERK";

  const totalEmployees = departments.reduce((acc, d) => acc + d.employees.length, 0);
  const totalPresent = departments.reduce(
    (acc, d) =>
      acc +
      d.employees.filter(
        (e) => e.attendances[0] && Number(e.attendances[0].hoursWorked) > 0
      ).length,
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
            <span className="font-semibold text-emerald-600">{totalPresent}</span> ከ {totalEmployees} ሠራተኞች ተገኝተዋል
          </p>
        </div>

        {/* Date picker client island */}
        <div className="flex items-center gap-3">
          <DatePicker defaultValue={dateStr} />
        </div>
      </div>

      <AttendanceGrid
        departments={departments.map((d) => ({
          id: d.id,
          nameAm: d.nameAm,
          employees: d.employees.map((e) => ({
            id: e.id,
            serialNumber: e.serialNumber,
            nameAm: e.nameAm,
            attendance: e.attendances[0]
              ? {
                  id: e.attendances[0].id,
                  hoursWorked: Number(e.attendances[0].hoursWorked),
                  lineId: e.attendances[0].lineId ?? "",
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
