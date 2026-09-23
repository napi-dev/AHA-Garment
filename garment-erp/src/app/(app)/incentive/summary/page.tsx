import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { ethMonthName, todayEth } from "@/lib/ethiopian-calendar";
import { MonthlySummaryClient } from "./monthly-summary-client";
import Decimal from "decimal.js";

export default async function MonthlySummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "incentive:view");

  const params = await searchParams;
  const eth = todayEth();
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
      sortOrder: number;
      workers: Set<string>;
      p1Calc: Decimal;
      p1Pay: Decimal;
      p2Calc: Decimal;
      p2Pay: Decimal;
    }
  >();

  function addLines(
    lines: typeof p1.lines,
    field: "p1Calc" | "p1Pay" | "p2Calc" | "p2Pay",
    amountField: "calculated" | "payable"
  ) {
    for (const line of lines) {
      const dept = line.employee.department;
      if (!deptMap.has(dept.id)) {
        deptMap.set(dept.id, {
          nameAm: dept.nameAm,
          sortOrder: dept.sortOrder,
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
    .sort((a, b) => a[1].sortOrder - b[1].sortOrder)
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">
            {am.incentive.monthSummary}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5 font-ethiopic">
            {ethMonthName(month)} {year} ዓ.ም
          </p>
        </div>

        {/* Month selector */}
        <form method="GET" className="flex gap-2">
          <select name="year" defaultValue={year}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {[...new Set(allPeriods.map((p) => p.ethYear))].map((y) => (
              <option key={y} value={y}>{y} ዓ.ም</option>
            ))}
          </select>
          <select name="month" defaultValue={month}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-ethiopic">
            {am.ethMonths.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <button type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-ethiopic hover:bg-blue-700">
            {am.filter}
          </button>
        </form>
      </div>

      {/* Grand totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SumCard label={am.incentive.period1 + " " + am.incentive.calculated}
          value={p1 ? rows.reduce((s, r) => s + parseFloat(r.p1Calculated), 0).toFixed(2) : "—"} />
        <SumCard label={am.incentive.period2 + " " + am.incentive.calculated}
          value={p2 ? rows.reduce((s, r) => s + parseFloat(r.p2Calculated), 0).toFixed(2) : "—"} />
        <SumCard label={"ወር " + am.incentive.calculated}
          value={grandCalc.toFixed(2)} color="text-blue-700" />
        <SumCard label={"ወር " + am.incentive.payable}
          value={grandPay.toFixed(2)} color="text-emerald-700" />
      </div>

      {/* Client component: table + chart */}
      <MonthlySummaryClient rows={rows} grandCalc={grandCalc.toFixed(2)} grandPay={grandPay.toFixed(2)} />
    </div>
  );
}

function SumCard({ label, value, color = "text-gray-800" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-500 font-ethiopic mb-1">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
