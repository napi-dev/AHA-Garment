import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate, todayEth, ethMonthName } from "@/lib/ethiopian-calendar";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth/permissions";
import { DashboardCharts } from "./dashboard-charts";
import Decimal from "decimal.js";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { role } = session.user;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eth = todayEth();

  // ── Today's stats ─────────────────────────────────────────────────────────
  const [
    dayClose,
    countStats,
    aboveTarget,
    openAlerts,
    pendingPeriods,
  ] = await Promise.all([
    db.dayClose.findUnique({ where: { date: today } }),
    db.hourlyCountLine.aggregate({
      where: { sheet: { date: today }, status: { not: "DRAFT" } },
      _count: { _all: true },
      _sum:   { totalProduced: true, plusPieces: true },
    }),
    db.hourlyCountLine.count({ where: { sheet: { date: today }, plusPieces: { gt: 0 } } }),
    db.alert.count({ where: { resolvedAt: null } }),
    hasPermission(role, "incentive:approve")
      ? db.incentivePeriod.count({ where: { status: "PENDING_APPROVAL" } })
      : Promise.resolve(0),
  ]);

  // ── Last 14 days production trend ─────────────────────────────────────────
  const trendDays = 14;
  const trendStart = new Date(today);
  trendStart.setDate(trendStart.getDate() - trendDays + 1);

  const trendRaw = await db.hourlyCountLine.groupBy({
    by: [],
    where: { sheet: { date: { gte: trendStart, lte: today } }, status: "LOCKED" },
    _sum: { totalProduced: true, plusPieces: true },
  });

  // Per-day aggregation
  const trendPerDay: { date: string; produced: number; plus: number }[] = [];
  for (let i = 0; i < trendDays; i++) {
    const d = new Date(trendStart);
    d.setDate(d.getDate() + i);
    const closes = await db.dayClose.findUnique({ where: { date: d } });
    const dayAgg = await db.hourlyCountLine.aggregate({
      where: { sheet: { date: d }, status: "LOCKED" },
      _sum: { totalProduced: true, plusPieces: true },
    });
    trendPerDay.push({
      date:     formatAsEthDate(d),
      produced: dayAgg._sum.totalProduced ?? 0,
      plus:     dayAgg._sum.plusPieces    ?? 0,
    });
  }

  // ── Current period incentive cost ─────────────────────────────────────────
  const currentPeriod = await db.incentivePeriod.findFirst({
    where: { ethYear: eth.year, ethMonth: eth.month },
    orderBy: { periodNumber: "desc" },
  });

  let incentiveCostPer1000 = "—";
  let periodPayable = "—";
  if (currentPeriod) {
    const agg = await db.incentiveLine.aggregate({
      where:  { periodId: currentPeriod.id },
      _sum:   { payable: true },
      _count: { _all: true },
    });
    const totalPay = new Decimal(agg._sum.payable?.toString() ?? "0");
    const totalProd = trendRaw[0]?._sum.totalProduced ?? 1;
    periodPayable = totalPay.toFixed(2);
    incentiveCostPer1000 = totalProd > 0
      ? totalPay.div(totalProd).mul(1000).toFixed(2)
      : "—";
  }

  // ── Dept productivity for bar chart ──────────────────────────────────────
  const deptStats = await db.hourlyCountLine.groupBy({
    by:    ["departmentId"],
    where: { sheet: { date: today }, status: { not: "DRAFT" } },
    _sum:  { totalProduced: true, plusPieces: true, targetForDay: true },
  });

  const deptIds = deptStats.map((d) => d.departmentId);
  const depts   = await db.department.findMany({
    where: { id: { in: deptIds } },
    select: { id: true, nameAm: true },
  });
  const deptNameMap = Object.fromEntries(depts.map((d) => [d.id, d.nameAm]));

  const deptChartData = deptStats
    .map((d) => ({
      name:    deptNameMap[d.departmentId] ?? d.departmentId.slice(0, 8),
      target:  d._sum.targetForDay ?? 0,
      produced: d._sum.totalProduced ?? 0,
    }))
    .filter((d) => d.target > 0)
    .sort((a, b) => b.produced - a.produced)
    .slice(0, 10);

  // ── Open orders summary ──────────────────────────────────────────────────
  const openOrders = await db.prodOrder.count({ where: { isActive: true } });
  const overdueOrders = await db.prodOrder.count({
    where: { isActive: true, dueDate: { lt: today } },
  });

  const stats = [
    { label: am.dashboard.todayProduction, value: (countStats._sum.totalProduced ?? 0).toLocaleString(),
      sub: dayClose ? "✓ ቀን ተዘግቷል" : "ቀን አልተዘጋም", color: dayClose ? "text-green-600" : "text-amber-600" },
    { label: am.dashboard.workersAboveTarget, value: aboveTarget.toString(),
      sub: `${countStats._count._all} ሠራተኞች ቀርበዋል`, color: "text-blue-600" },
    { label: am.dashboard.openAlerts, value: openAlerts.toString(),
      sub: openAlerts > 0 ? "ትኩረት ያስፈልጋቸዋል" : "ሁሉም ጥሩ ነው", color: openAlerts > 0 ? "text-red-600" : "text-green-600" },
    { label: "ንቁ ትዕዛዞች", value: openOrders.toString(),
      sub: overdueOrders > 0 ? `${overdueOrders} ዘግይቷል ⚠️` : "ሁሉም በጊዜ ነው", color: overdueOrders > 0 ? "text-red-600" : "text-gray-500" },
    ...(hasPermission(role, "incentive:view") ? [
      { label: "ወቅታዊ ኢንሴንቲቭ (ብር)", value: periodPayable,
        sub: `${eth.day < 5 ? "ቀን 4" : "ቀን 19"} ክፍያ`, color: "text-emerald-600" },
      { label: "ለ1000 ፍሬ ኢ/ወጪ", value: incentiveCostPer1000,
        sub: "ብር / 1000 ፍሬ", color: "text-purple-600" },
    ] : []),
    ...(pendingPeriods > 0 ? [
      { label: am.dashboard.pendingApprovals, value: pendingPeriods.toString(),
        sub: "ለማፅደቅ ይጠባበቃሉ", color: "text-purple-600" },
    ] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{am.dashboard.title}</h1>
          <p className="text-gray-500 text-sm mt-0.5 font-ethiopic">
            {eth.day} {ethMonthName(eth.month)} {eth.year} ዓ.ም
            <span className="mx-2 text-gray-300">·</span>
            {formatAsEthDate(today)}
          </p>
        </div>
        {!dayClose && hasPermission(role, "counts:verify") && (
          <a href="/counts/close"
            className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-ethiopic font-semibold hover:bg-purple-700 transition-colors animate-pulse">
            🔒 ቀን ዝጋ
          </a>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-ethiopic mb-1 truncate">{s.label}</p>
            <p className={`text-3xl font-bold tabular-nums leading-none ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-1.5 font-ethiopic">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts (client component) */}
      <DashboardCharts
        trendData={trendPerDay}
        deptData={deptChartData}
        role={role}
      />

      {/* Quick actions */}
      <QuickActions role={role} />
    </div>
  );
}

function QuickActions({ role }: { role: string }) {
  const actions = [
    { label: "ቁጥር አስገባ",    href: "/counts/enter",      permission: "counts:enter",      color: "bg-blue-500" },
    { label: "ቀን ዝጋ",       href: "/counts/close",      permission: "counts:verify",     color: "bg-purple-500" },
    { label: "ቆረጣ ጀምር",    href: "/cutting/new",       permission: "cuts:edit",         color: "bg-orange-500" },
    { label: "ጥሬ እቃ ተቀበል", href: "/materials/receive", permission: "stock:edit",        color: "bg-teal-500" },
    { label: "ፍተሻ",          href: "/quality",           permission: "qc:edit",           color: "bg-pink-500" },
    { label: "ባንድሎች",        href: "/production/bundles",permission: "bundles:view",      color: "bg-indigo-500" },
    { label: "ኢንሴንቲቭ አፅድቅ", href: "/incentive",         permission: "incentive:approve", color: "bg-emerald-500" },
  ] as const;

  const visible = actions.filter((a) =>
    hasPermission(role as Parameters<typeof hasPermission>[0], a.permission)
  );
  if (!visible.length) return null;

  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 font-ethiopic">ፈጣን ተግባራት</h2>
      <div className="flex flex-wrap gap-3">
        {visible.map((a) => (
          <a key={a.href} href={a.href}
            className={`${a.color} text-white px-5 py-3 rounded-xl font-ethiopic text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all shadow-sm`}>
            {a.label}
          </a>
        ))}
      </div>
    </div>
  );
}
