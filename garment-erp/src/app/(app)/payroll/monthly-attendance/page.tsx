import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { getEffectiveEthDate } from "@/lib/date-override/effective-date";
import { ethMonthName, formatAsEthDate, dateToEth } from "@/lib/ethiopian-calendar";
import { MonthNavigation } from "../monthly-incentive/month-navigation";
import { Calendar, Users, CheckCircle, XCircle } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function MonthlyAttendancePage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "/payroll");

  const params = await searchParams;
  const eth = await getEffectiveEthDate();
  
  const year = params.year ? parseInt(params.year) : eth.year;
  const month = params.month ? parseInt(params.month) : eth.month;

  // Query attendance records and filter by Ethiopian month
  const attendanceRecords = await db.attendance.findMany({
    where: {
      date: {
        gte: new Date(new Date().getFullYear() - 1, 0, 1),
        lte: new Date(new Date().getFullYear() + 1, 11, 31),
      },
    },
    include: {
      employee: {
        include: {
          department: true,
        },
      },
    },
    orderBy: [
      { employee: { department: { flowOrder: "asc" } } },
      { employee: { serialNumber: "asc" } },
      { date: "asc" }
    ],
  });

  // Filter by Ethiopian month
  const filteredRecords = attendanceRecords.filter((record) => {
    const ethDate = dateToEth(record.date);
    return ethDate.year === year && ethDate.month === month;
  });

  if (filteredRecords.length === 0) {
    const monthLabel = `${ethMonthName(month)} ${year} ዓ.ም`;

    return (
      <div className="space-y-6">
        <div className="erp-card p-6 bg-gradient-to-r from-blue-900 via-indigo-950 to-purple-950 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Calendar size={24} className="text-blue-200" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-ethiopic">የወር መገኘት ማጠቃለያ</h1>
              <p className="text-slate-300 text-sm font-ethiopic">የሠራተኞች ወርሃዊ መገኘት ክትትል</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-ethiopic text-blue-200 bg-white/5 rounded-lg px-3 py-2 border border-white/10 w-fit">
            <Calendar size={14} />
            <span>{monthLabel}</span>
          </div>
        </div>

        <MonthNavigation currentYear={year} currentMonth={month} basePath="/payroll/monthly-attendance" />

        <div className="erp-card p-12 text-center">
          <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-600 font-ethiopic mb-2">ምንም መረጃ አልተገኘም</h3>
          <p className="text-sm text-slate-500 font-ethiopic">
            ለዚህ ወር የመገኘት መረጃ የለም። በሌላ ወር ይሞክሩ።
          </p>
        </div>
      </div>
    );
  }

  // Get date range
  const dates = filteredRecords.map(r => r.date).sort((a, b) => a.getTime() - b.getTime());
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  // Aggregate by employee
  const employeeMap = new Map<string, {
    employee: any;
    present: number;
    absent: number;
    leave: number;
    total: number;
  }>();

  for (const record of filteredRecords) {
    const existing = employeeMap.get(record.employeeId);
    
    // Derive counts from AttendanceStatus enum
    const isPresent = record.status === "PRESENT" ? 1 : 0;
    const isAbsent = (record.status === "ABSENT_UNAUTHORIZED" || record.status === "ABSENT_AUTHORIZED") ? 1 : 0;
    const isLeave = record.status === "SICK_LEAVE" ? 1 : 0;

    if (existing) {
      existing.present += isPresent;
      existing.absent += isAbsent;
      existing.leave += isLeave;
      existing.total += 1;
    } else {
      employeeMap.set(record.employeeId, {
        employee: record.employee,
        present: isPresent,
        absent: isAbsent,
        leave: isLeave,
        total: 1,
      });
    }
  }

  const rows = Array.from(employeeMap.values()).sort((a, b) => {
    if ((a.employee.department.flowOrder ?? 999) !== (b.employee.department.flowOrder ?? 999)) {
      return (a.employee.department.flowOrder ?? 999) - (b.employee.department.flowOrder ?? 999);
    }
    const aSerial = String(a.employee.serialNumber);
    const bSerial = String(b.employee.serialNumber);
    return aSerial.localeCompare(bSerial);
  });

  // Calculate totals
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalLeave = 0;
  let totalRecords = 0;

  for (const row of rows) {
    totalPresent += row.present;
    totalAbsent += row.absent;
    totalLeave += row.leave;
    totalRecords += row.total;
  }

  const monthLabel = `${ethMonthName(month)} ${year} ዓ.ም`;
  const dateRange = `${formatAsEthDate(startDate)} እስከ ${formatAsEthDate(endDate)}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="erp-card p-6 bg-gradient-to-r from-blue-900 via-indigo-950 to-purple-950 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Calendar size={24} className="text-blue-200" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-ethiopic">የወር መገኘት ማጠቃለያ</h1>
              <p className="text-slate-300 text-sm font-ethiopic">የሠራተኞች ወርሃዊ መገኘት ክትትል</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-ethiopic text-blue-200 bg-white/5 rounded-lg px-3 py-2 border border-white/10 w-fit">
          <Calendar size={14} />
          <span>{monthLabel} • {dateRange}</span>
        </div>
      </div>

      {/* Month Navigation */}
      <MonthNavigation currentYear={year} currentMonth={month} basePath="/payroll/monthly-attendance" />

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-5">
        <div className="erp-card p-5 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">ጠቅላላ የተገኙ</span>
            <CheckCircle size={18} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums">
            {totalPresent.toLocaleString()} <span className="text-sm font-normal">ቀናት</span>
          </p>
        </div>

        <div className="erp-card p-5 border-l-4 border-rose-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">ጠቅላላ ያልተገኙ</span>
            <XCircle size={18} className="text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-700 tabular-nums">
            {totalAbsent.toLocaleString()} <span className="text-sm font-normal">ቀናት</span>
          </p>
        </div>

        <div className="erp-card p-5 border-l-4 border-amber-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">ፈቃድ</span>
            <Calendar size={18} className="text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-700 tabular-nums">
            {totalLeave.toLocaleString()} <span className="text-sm font-normal">ቀናት</span>
          </p>
        </div>

        <div className="erp-card p-5 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">ሠራተኞች</span>
            <Users size={18} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">
            {rows.length}
          </p>
        </div>
      </div>

      {/* Data Table */}
      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead>
              <tr>
                <th className="w-12 text-center">ተ.ቁ.</th>
                <th className="text-right">ሙሉ ስም</th>
                <th className="text-right">የሠራተኛ ኮድ</th>
                <th className="text-right">ክፍል</th>
                <th className="text-center">የተገኙ ቀናት</th>
                <th className="text-center">ያልተገኙ ቀናት</th>
                <th className="text-center">የፈቃድ ቀናት</th>
                <th className="text-center">ጠቅላላ ቀናት</th>
                <th className="text-center">መገኘት %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const attendanceRate = row.total > 0 ? (row.present / row.total) * 100 : 0;
                
                return (
                  <tr key={row.employee.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="text-center tabular-nums text-slate-400">{idx + 1}</td>
                    <td className="font-ethiopic text-slate-900 font-medium text-right">
                      {row.employee.nameAm}
                    </td>
                    <td className="font-mono text-slate-600 text-xs text-right">
                      {row.employee.employeeCode ?? row.employee.serialNumber}
                    </td>
                    <td className="font-ethiopic text-slate-600 text-xs text-right">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {row.employee.department.nameAm}
                      </span>
                    </td>
                    <td className="tabular-nums text-center text-emerald-700 font-semibold">
                      {row.present}
                    </td>
                    <td className="tabular-nums text-center text-rose-600 font-semibold">
                      {row.absent > 0 ? row.absent : "—"}
                    </td>
                    <td className="tabular-nums text-center text-amber-600 font-semibold">
                      {row.leave > 0 ? row.leave : "—"}
                    </td>
                    <td className="tabular-nums text-center text-slate-700 font-semibold">
                      {row.total}
                    </td>
                    <td className={`tabular-nums text-center font-bold ${attendanceRate >= 90 ? "text-emerald-700" : attendanceRate >= 75 ? "text-amber-700" : "text-rose-600"}`}>
                      {attendanceRate.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                <td colSpan={4} className="p-4 text-right font-ethiopic text-slate-800">
                  ጠቅላላ ድምር:
                </td>
                <td className="p-4 tabular-nums text-center text-emerald-700">
                  {totalPresent}
                </td>
                <td className="p-4 tabular-nums text-center text-rose-600">
                  {totalAbsent}
                </td>
                <td className="p-4 tabular-nums text-center text-amber-600">
                  {totalLeave}
                </td>
                <td className="p-4 tabular-nums text-center text-slate-700">
                  {totalRecords}
                </td>
                <td className="p-4 tabular-nums text-center text-blue-700">
                  {totalRecords > 0 ? ((totalPresent / totalRecords) * 100).toFixed(1) : "0.0"}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
