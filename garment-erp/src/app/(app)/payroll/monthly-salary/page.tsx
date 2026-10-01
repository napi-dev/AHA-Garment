import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { getEffectiveEthDate } from "@/lib/date-override/effective-date";
import { ethMonthName, formatAsEthDate } from "@/lib/ethiopian-calendar";
import { MonthNavigation } from "../monthly-incentive/month-navigation";
import { Wallet, Users, Calendar, TrendingUp } from "lucide-react";
import Decimal from "decimal.js";

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function MonthlySalaryPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "incentive:view");

  const params = await searchParams;
  const eth = await getEffectiveEthDate();
  
  const year = params.year ? parseInt(params.year) : eth.year;
  const month = params.month ? parseInt(params.month) : eth.month;

  // Get incentive data for the month (with lines for aggregation)
  const periods = await db.incentivePeriod.findMany({
    where: { ethYear: year, ethMonth: month },
    include: {
      lines: true,
    },
    orderBy: { periodNumber: "asc" },
  });

  // Determine date range from periods
  let startGreg: Date;
  let endGreg: Date;

  if (periods.length > 0) {
    startGreg = periods[0].startDate;
    endGreg = periods[periods.length - 1].endDate;
  } else {
    // Fallback: use approximate date from dateToEth
    const { dateToEth } = await import("@/lib/ethiopian-calendar");
    // Try to find a reference date in current month
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayEth = dateToEth(today);
    
    if (todayEth.year === year && todayEth.month === month) {
      startGreg = today;
      endGreg = today;
    } else {
      // Use a far past date to ensure no results
      startGreg = new Date("2000-01-01");
      endGreg = new Date("2000-01-01");
    }
  }

  // Fetch all active employees with their salaries
  const employees = await db.employee.findMany({
    where: { isActive: true },
    include: {
      department: true,
      salaryRecords: {
        where: {
          effectiveFrom: { lte: endGreg },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: startGreg } }
          ]
        },
        orderBy: { effectiveFrom: "desc" },
        take: 1,
      },
    },
    orderBy: [
      { department: { sortOrder: "asc" } },
      { serialNumber: "asc" }
    ],
  });

  // Aggregate incentive by employee
  const incentiveByEmployee = new Map<string, Decimal>();
  for (const period of periods) {
    for (const line of period.lines) {
      const current = incentiveByEmployee.get(line.employeeId) ?? new Decimal(0);
      incentiveByEmployee.set(
        line.employeeId,
        current.plus(new Decimal(line.payable.toString()))
      );
    }
  }

  // Get attendance data
  const attendanceData = await db.attendance.findMany({
    where: {
      date: { gte: startGreg, lte: endGreg },
      employeeId: { in: employees.map(e => e.id) },
    },
  });

  const attendanceByEmployee = new Map<string, typeof attendanceData>();
  for (const att of attendanceData) {
    const existing = attendanceByEmployee.get(att.employeeId) ?? [];
    existing.push(att);
    attendanceByEmployee.set(att.employeeId, existing);
  }

  // Calculate totals and build rows
  let totalBaseSalary = new Decimal(0);
  let totalIncentive = new Decimal(0);
  let totalCompensation = new Decimal(0);

  const rows = employees
    .filter(emp => emp.salaryRecords.length > 0) // Only employees with salary records
    .map((emp, idx) => {
      const baseSalary = emp.salaryRecords[0]
        ? new Decimal(emp.salaryRecords[0].amount.toString())
        : new Decimal(0);
      const incentive = incentiveByEmployee.get(emp.id) ?? new Decimal(0);
      const total = baseSalary.plus(incentive);

      const attendances = attendanceByEmployee.get(emp.id) ?? [];
      const presentDays = attendances.filter(a => new Decimal(a.hoursWorked.toString()).greaterThan(0)).length;

      totalBaseSalary = totalBaseSalary.plus(baseSalary);
      totalIncentive = totalIncentive.plus(incentive);
      totalCompensation = totalCompensation.plus(total);

      return {
        serial: idx + 1,
        employee: emp,
        baseSalary,
        incentive,
        total,
        presentDays,
        effectiveDate: emp.salaryRecords[0]?.effectiveFrom,
      };
    });

  const monthLabel = `${ethMonthName(month)} ${year} ዓ.ም`;
  const dateRange = `${formatAsEthDate(startGreg)} እስከ ${formatAsEthDate(endGreg)}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="erp-card p-6 bg-gradient-to-r from-indigo-900 via-purple-950 to-pink-950 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Wallet size={24} className="text-purple-200" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-ethiopic">የወር ደሞዝ ማጠቃለያ</h1>
              <p className="text-slate-300 text-sm font-ethiopic">የሠራተኞች ወርሃዊ ቋሚ ደሞዝ እና ኢንሴንቲቭ</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-ethiopic text-purple-200 bg-white/5 rounded-lg px-3 py-2 border border-white/10 w-fit">
          <Calendar size={14} />
          <span>{monthLabel} • {dateRange}</span>
        </div>
      </div>

      {/* Month Navigation */}
      <MonthNavigation currentYear={year} currentMonth={month} basePath="/payroll/monthly-salary" />

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-5">
        <div className="erp-card p-5 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">ጠቅላላ ቋሚ ደሞዝ</span>
            <Wallet size={18} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700 tabular-nums">
            {totalBaseSalary.toFixed(2)} <span className="text-sm font-normal">ብር</span>
          </p>
        </div>

        <div className="erp-card p-5 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">ጠቅላላ ኢንሴንቲቭ</span>
            <TrendingUp size={18} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums">
            {totalIncentive.toFixed(2)} <span className="text-sm font-normal">ብር</span>
          </p>
        </div>

        <div className="erp-card p-5 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">ጠቅላላ ክፍያ</span>
            <Wallet size={18} className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-700 tabular-nums">
            {totalCompensation.toFixed(2)} <span className="text-sm font-normal">ብር</span>
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
      {rows.length === 0 ? (
        <div className="erp-card p-12 text-center">
          <Wallet size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-600 font-ethiopic mb-2">ምንም መረጃ አልተገኘም</h3>
          <p className="text-sm text-slate-500 font-ethiopic">
            ምንም ንቁ ሠራተኞች ወይም የደሞዝ መረጃ የለም።
          </p>
        </div>
      ) : (
        <div className="erp-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm data-table">
              <thead>
                <tr>
                  <th className="w-12 text-center">ተ.ቁ.</th>
                  <th className="text-right">ሙሉ ስም</th>
                  <th className="text-right">የሠራተኛ ኮድ</th>
                  <th className="text-right">ክፍል</th>
                  <th className="text-right">ቋሚ ደሞዝ (ብር)</th>
                  <th className="text-right">ኢንሴንቲቭ (ብር)</th>
                  <th className="text-right">ጠቅላላ (ብር)</th>
                  <th className="text-center">የተገኙ ቀናት</th>
                  <th className="text-center">ደሞዝ ከ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.employee.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="text-center tabular-nums text-slate-400">{row.serial}</td>
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
                    <td className="tabular-nums font-semibold text-right text-blue-700">
                      {row.baseSalary.toFixed(2)}
                    </td>
                    <td className="tabular-nums font-semibold text-right text-emerald-700">
                      {row.incentive.toFixed(2)}
                    </td>
                    <td className="tabular-nums font-bold text-right text-purple-700 bg-purple-50/50">
                      {row.total.toFixed(2)}
                    </td>
                    <td className="tabular-nums text-center text-slate-700">
                      {row.presentDays > 0 ? row.presentDays : "—"}
                    </td>
                    <td className="text-center text-xs text-slate-500">
                      {row.effectiveDate ? formatAsEthDate(row.effectiveDate) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                  <td colSpan={4} className="p-4 text-right font-ethiopic text-slate-800">
                    ጠቅላላ ድምር:
                  </td>
                  <td className="p-4 tabular-nums text-right text-blue-700">
                    {totalBaseSalary.toFixed(2)} ብር
                  </td>
                  <td className="p-4 tabular-nums text-right text-emerald-700">
                    {totalIncentive.toFixed(2)} ብር
                  </td>
                  <td className="p-4 tabular-nums text-right text-purple-700 bg-purple-50">
                    {totalCompensation.toFixed(2)} ብር
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
