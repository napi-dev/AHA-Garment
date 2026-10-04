import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { ethMonthName } from "@/lib/ethiopian-calendar";
import { getEffectiveEthDate } from "@/lib/date-override/effective-date";
import { MonthlySummaryClient } from "./monthly-summary-client";
import Link from "next/link";
import Decimal from "decimal.js";
import { BarChart2, ArrowRight, Filter, Calendar, Award, Calculator, TrendingUp } from "lucide-react";

export default async function MonthlySummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "/incentive");

  const params = await searchParams;
  const eth = await getEffectiveEthDate();
  const year  = parseInt(params.year  ?? String(eth.year),  10);
  const month = parseInt(params.month ?? String(eth.month), 10);

  // Load the two periods for this month
  const periods = await db.incentivePeriod.findMany({
    where: { ethYear: year, ethMonth: month },
    include: {
      lines: {
        include: { employee: { include: { department: true } } },
      },
    },
    orderBy: { periodNumber: "asc" },
  });

  const p1 = periods.find((p) => p.periodNumber === 1);
  const p2 = periods.find((p) => p.periodNumber === 2);

  // Build department-level summary matching appendix B layout
  const deptMap = new Map<
    string,
    {
      nameAm: string;
      flowOrder: number;
      workers: Set<string>;
      p1Calc: Decimal;
      p1Pay: Decimal;
      p2Calc: Decimal;
      p2Pay: Decimal;
    }
  >();

  type PeriodLines = (typeof periods)[0]["lines"];
  function addLines(
    lines: PeriodLines,
    field: "p1Calc" | "p1Pay" | "p2Calc" | "p2Pay",
    amountField: "calculated" | "payable"
  ) {
    for (const line of lines) {
      const dept = line.employee.department;
      if (!deptMap.has(dept.id)) {
        deptMap.set(dept.id, {
          nameAm: dept.nameAm,
          flowOrder: dept.flowOrder ?? 999,
          workers: new Set(),
          p1Calc: new Decimal(0), p1Pay: new Decimal(0),
          p2Calc: new Decimal(0), p2Pay: new Decimal(0),
        });
      }
      const d = deptMap.get(dept.id)!;
      d.workers.add(line.employeeId);
      d[field] = d[field].plus(new Decimal(line[amountField].toString()));
    }
  }

  if (p1) {
    addLines(p1.lines, "p1Calc", "calculated");
    addLines(p1.lines, "p1Pay",  "payable");
  }
  if (p2) {
    addLines(p2.lines, "p2Calc", "calculated");
    addLines(p2.lines, "p2Pay",  "payable");
  }

  const rows = [...deptMap.entries()]
    .sort((a, b) => a[1].flowOrder - b[1].flowOrder)
    .map(([deptId, d]) => ({
      deptId,
      nameAm:          d.nameAm,
      workers:         d.workers.size,
      p1Calculated:    d.p1Calc.toFixed(2),
      p2Calculated:    d.p2Calc.toFixed(2),
      monthCalculated: d.p1Calc.plus(d.p2Calc).toFixed(2),
      monthPayable:    d.p1Pay.plus(d.p2Pay).toFixed(2),
    }));

  const grandCalc = rows.reduce((s, r) => s.plus(new Decimal(r.monthCalculated)), new Decimal(0));
  const grandPay  = rows.reduce((s, r) => s.plus(new Decimal(r.monthPayable)),    new Decimal(0));

  // Available months (for the selector)
  const allPeriods = await db.incentivePeriod.findMany({
    select: { ethYear: true, ethMonth: true },
    distinct: ["ethYear", "ethMonth"],
    orderBy: [{ ethYear: "desc" }, { ethMonth: "desc" }],
  });

  return (
    <div className="space-y-6">
      {/* Top Navigation Link */}
      <div>
        <Link
          href="/incentive"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors font-ethiopic"
        >
          <ArrowRight size={14} className="rotate-180" />
          <span>ወደ ኢንሴንቲቭ ዝርዝር ተመለስ</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="erp-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider font-ethiopic">
            <BarChart2 size={14} />
            <span>ወርሃዊ የክፍያ ማጠቃለያ</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
            {am.incentive.monthSummary}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-ethiopic flex items-center gap-2">
            <Calendar size={14} className="text-slate-400" />
            <span>{ethMonthName(month)} {year} ዓ.ም</span>
          </p>
        </div>

        {/* Month Selector */}
        <form method="GET" className="flex items-center gap-2.5">
          <select
            name="year"
            defaultValue={year}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {[...new Set([eth.year, ...allPeriods.map((p) => p.ethYear)])].map((y) => (
              <option key={y} value={y}>{y} ዓ.ም</option>
            ))}
          </select>
          <select
            name="month"
            defaultValue={month}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-ethiopic"
          >
            {am.ethMonths.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <button
            type="submit"
            className="btn-secondary flex items-center gap-2 px-4 py-2 font-ethiopic"
          >
            <Filter size={15} />
            <span>{am.filter}</span>
          </button>
        </form>
      </div>

      {/* Grand Totals Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <p className="text-xs font-medium text-slate-500 font-ethiopic mb-1">
            {am.incentive.period1} የተሰላ
          </p>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">
            {p1 ? rows.reduce((s, r) => s + parseFloat(r.p1Calculated), 0).toLocaleString("en-ET", { minimumFractionDigits: 2 }) : "—"}
          </p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <p className="text-xs font-medium text-slate-500 font-ethiopic mb-1">
            {am.incentive.period2} የተሰላ
          </p>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">
            {p2 ? rows.reduce((s, r) => s + parseFloat(r.p2Calculated), 0).toLocaleString("en-ET", { minimumFractionDigits: 2 }) : "—"}
          </p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <p className="text-xs font-medium text-slate-500 font-ethiopic mb-1">
            ወርሃዊ የተሰላ ድምር
          </p>
          <p className="text-2xl font-bold text-blue-700 tabular-nums">
            {grandCalc.toNumber().toLocaleString("en-ET", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <p className="text-xs font-medium text-slate-500 font-ethiopic mb-1">
            ወርሃዊ የሚከፈል የተጣራ
          </p>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums">
            {grandPay.toNumber().toLocaleString("en-ET", { minimumFractionDigits: 2 })} <span className="text-xs font-normal">ብር</span>
          </p>
        </div>
      </div>

      {/* Client Component: Table + BarChart */}
      <MonthlySummaryClient
        rows={rows}
        grandCalc={grandCalc.toFixed(2)}
        grandPay={grandPay.toFixed(2)}
      />
    </div>
  );
}
