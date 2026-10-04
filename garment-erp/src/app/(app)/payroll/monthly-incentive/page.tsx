import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { getEffectiveEthDate } from "@/lib/date-override/effective-date";
import { ethMonthName, formatAsEthDate, dateToEth } from "@/lib/ethiopian-calendar";
import { MonthNavigation } from "./month-navigation";
import { Award, TrendingUp, Users, Calendar } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function MonthlyIncentivePage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "/payroll");

  const params = await searchParams;
  const eth = await getEffectiveEthDate();
  
  const year = params.year ? parseInt(params.year) : eth.year;
  const month = params.month ? parseInt(params.month) : eth.month;

  // Query HourlyBox data (v2 replacement for hourlyCountLine)
  const boxes = await db.hourlyBox.findMany({
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
          job: true,
        },
      },
      job: true,
    },
  });

  // Filter by Ethiopian month/year
  const filteredBoxes = boxes.filter((box: typeof boxes[0]) => {
    const ethDate = dateToEth(box.date);
    return ethDate.year === year && ethDate.month === month;
  });

  const monthLabel = `${ethMonthName(month)} ${year} ዓ.ም`;

  if (filteredBoxes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="erp-card p-6 bg-gradient-to-r from-emerald-900 via-teal-950 to-cyan-950 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Award size={24} className="text-emerald-200" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-ethiopic">የወር ኢንሴንቲቭ ማጠቃለያ</h1>
              <p className="text-slate-300 text-sm font-ethiopic">የሠራተኞች ወርሃዊ የምርት ማበረታቻ ክፍያ</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-ethiopic text-emerald-200 bg-white/5 rounded-lg px-3 py-2 border border-white/10 w-fit">
            <Calendar size={14} />
            <span>{monthLabel}</span>
          </div>
        </div>
        <MonthNavigation currentYear={year} currentMonth={month} basePath="/payroll/monthly-incentive" />
        <div className="erp-card p-12 text-center">
          <Award size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-600 font-ethiopic mb-2">ምንም መረጃ አልተገኘም</h3>
          <p className="text-sm text-slate-500 font-ethiopic">
            ለዚህ ወር የምርት መረጃ የለም። በሌላ ወር ይሞክሩ።
          </p>
        </div>
      </div>
    );
  }

  // Get date range
  const dates = filteredBoxes.map((b: typeof boxes[0]) => b.date).sort((a: Date, b: Date) => a.getTime() - b.getTime());
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  // Aggregate data by employee from HourlyBox
  const employeeData = new Map<string, {
    employee: any;
    jobId: string | null;
    totalProduced: number;
    plusPieces: number;
    minusPieces: number;
    mistakes: number;
    days: number;
  }>();

  for (const box of filteredBoxes) {
    const existing = employeeData.get(box.employeeId);

    if (existing) {
      existing.totalProduced += box.totalProduced;
      existing.plusPieces += box.plusPieces;
      existing.minusPieces += box.minusPieces;
      existing.mistakes += box.mistakes;
      existing.days += 1;
    } else {
      employeeData.set(box.employeeId, {
        employee: box.employee,
        jobId: box.jobId,
        totalProduced: box.totalProduced,
        plusPieces: box.plusPieces,
        minusPieces: box.minusPieces,
        mistakes: box.mistakes,
        days: 1,
      });
    }
  }

  // Get incentive cards by jobId (v2: card is per Job, not per Department)
  const jobIds = Array.from(new Set(Array.from(employeeData.values()).map(e => e.jobId).filter(Boolean))) as string[];
  const incentiveCards = await db.incentiveCard.findMany({
    where: {
      jobId: { in: jobIds },
      effectiveFrom: { lte: endDate },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: startDate } }
      ]
    },
    orderBy: { effectiveFrom: "desc" },
  });

  // Map job to rate
  const rateByJob = new Map<string, number>();
  for (const card of incentiveCards) {
    if (!rateByJob.has(card.jobId)) {
      rateByJob.set(card.jobId, parseFloat(card.ratePerPiece.toString()));
    }
  }

  const rows = Array.from(employeeData.values()).sort((a: any, b: any) => {
    const flowA = a.employee.department?.flowOrder ?? 999;
    const flowB = b.employee.department?.flowOrder ?? 999;
    if (flowA !== flowB) return flowA - flowB;
    return String(a.employee.serialNumber).localeCompare(String(b.employee.serialNumber));
  });

  // Calculate totals
  let totalProduced = 0;
  let totalPlus = 0;
  let totalMinus = 0;
  let totalIncentive = 0;

  for (const row of rows) {
    totalProduced += row.totalProduced;
    totalPlus += row.plusPieces;
    totalMinus += row.minusPieces;
    
    const rate = row.jobId ? (rateByJob.get(row.jobId) ?? 0) : 0;
    if (row.plusPieces > 0) {
      totalIncentive += row.plusPieces * rate;
    }
  }

  const dateRange = `${formatAsEthDate(startDate)} እስከ ${formatAsEthDate(endDate)}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="erp-card p-6 bg-gradient-to-r from-emerald-900 via-teal-950 to-cyan-950 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Award size={24} className="text-emerald-200" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-ethiopic">የወር ኢንሴንቲቭ ማጠቃለያ</h1>
              <p className="text-slate-300 text-sm font-ethiopic">የሠራተኞች ወርሃዊ የምርት ማበረታቻ ክፍያ</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-ethiopic text-emerald-200 bg-white/5 rounded-lg px-3 py-2 border border-white/10 w-fit">
          <Calendar size={14} />
          <span>{monthLabel} • {dateRange}</span>
        </div>
      </div>

      {/* Month Navigation */}
      <MonthNavigation currentYear={year} currentMonth={month} basePath="/payroll/monthly-incentive" />

      {/* Summary Cards */}
      <div className="grid md:grid-cols-5 gap-5">
        <div className="erp-card p-5 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">ጠቅላላ የተመረተ</span>
            <Award size={18} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700 tabular-nums">
            {totalProduced.toLocaleString()} <span className="text-sm font-normal">ፍሬ</span>
          </p>
        </div>

        <div className="erp-card p-5 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">+ትርፍ ፍሬዎች</span>
            <TrendingUp size={18} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums">
            +{totalPlus.toLocaleString()}
          </p>
        </div>

        <div className="erp-card p-5 border-l-4 border-rose-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">−ማጣት ፍሬዎች</span>
            <TrendingUp size={18} className="text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-700 tabular-nums">
            {totalMinus > 0 ? `−${totalMinus.toLocaleString()}` : "—"}
          </p>
        </div>

        <div className="erp-card p-5 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">ጠቅላላ ኢንሴንቲቭ</span>
            <Award size={18} className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-700 tabular-nums">
            {totalIncentive.toFixed(2)} <span className="text-sm font-normal">ብር</span>
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
                <th className="text-right">ኮድ</th>
                <th className="text-right">ክፍል</th>
                <th className="text-center">ቀናት</th>
                <th className="text-center">የተመረተ</th>
                <th className="text-center">+ትርፍ</th>
                <th className="text-center">−ማጣት</th>
                <th className="text-center">ተመን</th>
                <th className="text-right">ኢንሴንቲቭ (ብር)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const rate = row.jobId ? (rateByJob.get(row.jobId) ?? 0) : 0;
                const incentive = row.plusPieces > 0 ? row.plusPieces * rate : 0;
                
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
                        {row.employee.department?.nameAm}
                      </span>
                    </td>
                    <td className="tabular-nums text-center text-slate-700 font-semibold">
                      {row.days}
                    </td>
                    <td className="tabular-nums text-center text-blue-700 font-semibold">
                      {row.totalProduced.toLocaleString()}
                    </td>
                    <td className="tabular-nums text-center text-emerald-700 font-semibold">
                      {row.plusPieces > 0 ? `+${row.plusPieces.toLocaleString()}` : "—"}
                    </td>
                    <td className="tabular-nums text-center text-rose-600 font-semibold">
                      {row.minusPieces > 0 ? `−${row.minusPieces.toLocaleString()}` : "—"}
                    </td>
                    <td className="tabular-nums text-center text-slate-600">
                      {rate > 0 ? rate.toFixed(4) : "—"}
                    </td>
                    <td className="tabular-nums text-right font-bold text-purple-700">
                      {incentive > 0 ? incentive.toFixed(2) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                <td colSpan={5} className="p-4 text-right font-ethiopic text-slate-800">
                  ጠቅላላ ድምር:
                </td>
                <td className="p-4 tabular-nums text-center text-blue-700">
                  {totalProduced.toLocaleString()}
                </td>
                <td className="p-4 tabular-nums text-center text-emerald-700">
                  +{totalPlus.toLocaleString()}
                </td>
                <td className="p-4 tabular-nums text-center text-rose-600">
                  {totalMinus > 0 ? `−${totalMinus.toLocaleString()}` : "—"}
                </td>
                <td className="p-4 text-center text-slate-500">—</td>
                <td className="p-4 tabular-nums text-right text-purple-700">
                  {totalIncentive.toFixed(2)} ብር
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
