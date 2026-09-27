import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate, todayEth, ethMonthName } from "@/lib/ethiopian-calendar";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth/permissions";
import { DashboardCharts } from "./dashboard-charts";
import Decimal from "decimal.js";
import Link from "next/link";
import {
  Factory, Users, AlertTriangle, Clock, Layers,
  Scissors, Package, TrendingUp, CheckCircle2,
  Calendar, ArrowRight, ShieldAlert, Sparkles, CheckSquare
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { role, nameAm } = session.user;

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

  // Single query: fetch all locked lines in the 14-day window with their sheet date
  const trendRaw = await db.hourlyCountLine.findMany({
    where: { sheet: { date: { gte: trendStart, lte: today } }, status: "LOCKED" },
    select: { sheet: { select: { date: true } }, totalProduced: true, plusPieces: true },
  });

  // Aggregate in memory by day — avoids 14 round-trips
  const trendMap = new Map<string, { produced: number; plus: number }>();
  let grandTotalProduced = 0;
  for (const row of trendRaw) {
    const key = row.sheet.date.toISOString().split("T")[0];
    const existing = trendMap.get(key) ?? { produced: 0, plus: 0 };
    existing.produced += row.totalProduced ?? 0;
    existing.plus     += row.plusPieces    ?? 0;
    trendMap.set(key, existing);
    grandTotalProduced += row.totalProduced ?? 0;
  }

  // Build ordered 14-day series
  const trendPerDay: { date: string; produced: number; plus: number }[] = [];
  for (let i = 0; i < trendDays; i++) {
    const d = new Date(trendStart);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split("T")[0];
    const agg = trendMap.get(key) ?? { produced: 0, plus: 0 };
    trendPerDay.push({ date: formatAsEthDate(d), produced: agg.produced, plus: agg.plus });
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
    const totalPay  = new Decimal(agg._sum.payable?.toString() ?? "0");
    const totalProd = grandTotalProduced;
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

  const totalWorkersAttended = countStats._count._all;

  return (
    <div className="space-y-8">
      {/* Welcome & Shift Status Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 stitch-pattern opacity-15 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-ethiopic text-blue-200 border border-white/10">
              <Calendar size={13} className="text-blue-300" />
              <span>{eth.day} {ethMonthName(eth.month)} {eth.year} ዓ.ም</span>
              <span>·</span>
              <span>{formatAsEthDate(today)}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-ethiopic tracking-tight">
              እንኳን ደህና መጡ፣ {nameAm}
            </h1>
            <p className="text-slate-300 text-sm font-ethiopic max-w-xl">
              የልብስ ፋብሪካ ዕለታዊ የምርት ፍሰት፣ የሠራተኞች መገኘትና የጥራት ቁጥጥር ዳሽቦርድ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!dayClose && hasPermission(role, "counts:verify") && (
              <Link
                href="/counts/close"
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-ethiopic font-semibold text-sm hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-900/30 flex items-center gap-2 animate-pulse"
              >
                <CheckSquare size={16} />
                <span>{am.counts.closeDay}</span>
              </Link>
            )}
            <Link
              href="/counts/enter"
              className="px-5 py-3 rounded-2xl bg-white text-slate-900 font-ethiopic font-semibold text-sm hover:bg-slate-100 transition-all shadow-md flex items-center gap-2"
            >
              <Clock size={16} className="text-blue-600" />
              <span>{am.counts.enterCount}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Today's Production */}
        <div className="erp-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">
              {am.dashboard.todayProduction}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Factory size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold text-slate-900 tabular-nums">
              {(countStats._sum.totalProduced ?? 0).toLocaleString()}
              <span className="text-xs font-normal text-slate-400 ml-1 font-ethiopic">ፍሬ</span>
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-ethiopic">
              {dayClose ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 size={13} />
                  የዕለት ሥራ ተጠቃልሎ ተዘግቷል
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                  <Clock size={13} />
                  የዕለት ሥራ ክፍት ነው
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Above Target Workers */}
        <div className="erp-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">
              {am.dashboard.workersAboveTarget}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold text-emerald-600 tabular-nums">
              {aboveTarget}
              <span className="text-xs font-normal text-slate-400 ml-1 font-ethiopic">ሠራተኞች</span>
            </p>
            <p className="mt-2 text-xs text-slate-500 font-ethiopic">
              ከቀረቡት {totalWorkersAttended} ሠራተኞች መካከል
            </p>
          </div>
        </div>

        {/* Active Production Orders */}
        <div className="erp-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">
              ንቁ የምርት ትዕዛዞች
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold text-slate-900 tabular-nums">
              {openOrders}
              <span className="text-xs font-normal text-slate-400 ml-1 font-ethiopic">ትዕዛዞች</span>
            </p>
            <p className="mt-2 text-xs font-ethiopic">
              {overdueOrders > 0 ? (
                <span className="text-rose-600 font-medium flex items-center gap-1">
                  <AlertTriangle size={12} />
                  {overdueOrders} የዘገዩ ትዕዛዞች አሉ
                </span>
              ) : (
                <span className="text-slate-500">ሁሉም ትዕዛዞች በጊዜ ሂደት ላይ ናቸው</span>
              )}
            </p>
          </div>
        </div>

        {/* Open System Alerts */}
        <div className="erp-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">
              {am.dashboard.openAlerts}
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              openAlerts > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
            }`}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className={`text-3xl font-bold tabular-nums ${openAlerts > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {openAlerts}
            </p>
            <p className="mt-2 text-xs font-ethiopic">
              {openAlerts > 0 ? (
                <Link href="/alerts" className="text-rose-600 font-medium hover:underline inline-flex items-center gap-1">
                  ትኩረት የሚሹ ማስጠንቀቂያዎች ይመልከቱ →
                </Link>
              ) : (
                <span className="text-emerald-600 font-medium">ሁሉም የፋብሪካ ሂደቶች ጤናማ ናቸው</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Financial / Incentive KPI if permitted */}
      {(hasPermission(role, "incentive:view") || pendingPeriods > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {hasPermission(role, "incentive:view") && (
            <>
              <div className="erp-card p-5 border-l-4 border-emerald-500">
                <p className="text-xs text-slate-500 font-ethiopic">ወቅታዊ የኢንሴንቲቭ ክፍያ</p>
                <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">
                  {periodPayable} <span className="text-xs font-normal text-slate-400">ብር</span>
                </p>
                <p className="text-xs text-slate-400 font-ethiopic mt-1">
                  {eth.day < 5 ? "የ1ኛ ወቅት (ቀን 4)" : "የ2ኛ ወቅት (ቀን 19)"} ክፍያ
                </p>
              </div>

              <div className="erp-card p-5 border-l-4 border-indigo-500">
                <p className="text-xs text-slate-500 font-ethiopic">የ1000 ፍሬ ኢንሴንቲቭ ወጪ</p>
                <p className="text-2xl font-bold text-indigo-700 tabular-nums mt-1">
                  {incentiveCostPer1000} <span className="text-xs font-normal text-slate-400">ብር / 1000 ፍሬ</span>
                </p>
                <p className="text-xs text-slate-400 font-ethiopic mt-1">
                  የምርት ውጤታማነት ወጪ ንፅፅር
                </p>
              </div>
            </>
          )}

          {pendingPeriods > 0 && (
            <div className="erp-card p-5 border-l-4 border-amber-500 bg-amber-50/30">
              <p className="text-xs text-amber-900 font-ethiopic">{am.dashboard.pendingApprovals}</p>
              <p className="text-2xl font-bold text-amber-700 tabular-nums mt-1">
                {pendingPeriods} <span className="text-xs font-normal text-amber-600">ወቅቶች</span>
              </p>
              <Link href="/incentive" className="text-xs text-amber-800 font-semibold font-ethiopic mt-1 hover:underline block">
                የማኔጅመንት ማረጋገጫ ለመስጠት ይጫኑ →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Charts Section */}
      <DashboardCharts
        trendData={trendPerDay}
        deptData={deptChartData}
        role={role}
      />

      {/* Quick Action Station */}
      <QuickActions role={role} />
    </div>
  );
}

function QuickActions({ role }: { role: string }) {
  const actions = [
    {
      label: "የሰዓት ቁጥር መዝግብ",
      desc: "የእያንዳንዱን ሠራተኛ የሰዓት ውጤት አስገባ",
      href: "/counts/enter",
      permission: "counts:enter",
      icon: <Clock size={20} className="text-blue-600" />,
      badge: "ዕለታዊ",
    },
    {
      label: "የዕለት ሥራ አጠቃልል",
      desc: "የዕለቱን የምርት ሰሌዳ ፈትሽና ዝጋ",
      href: "/counts/close",
      permission: "counts:verify",
      icon: <CheckSquare size={20} className="text-purple-600" />,
      badge: "ቀን ማጠቃለያ",
    },
    {
      label: "አዲስ ቆረጣ ጀምር",
      desc: "ለጨርቅ ቆረጣ ክፍል ትዕዛዝ መዝግብ",
      href: "/cutting/new",
      permission: "cuts:edit",
      icon: <Scissors size={20} className="text-orange-600" />,
      badge: undefined as string | undefined,
    },
    {
      label: "ጥሬ ዕቃ ገቢ አድርግ",
      desc: "የመጡ አዳዲስ ጥሬ ዕቃዎችን አስመዝግብ",
      href: "/materials/receive",
      permission: "stock:edit",
      icon: <Package size={20} className="text-teal-600" />,
      badge: undefined as string | undefined,
    },
    {
      label: "የጥራት ፍተሻ (QC)",
      desc: "ባንድሎችን መርምርና አፅድቅ",
      href: "/quality",
      permission: "qc:edit",
      icon: <CheckCircle2 size={20} className="text-pink-600" />,
      badge: undefined as string | undefined,
    },
    {
      label: "የስራ ባንድሎች (Bundles)",
      desc: "የተቆረጡ የስራ ጥቅሎች ክትትል",
      href: "/production/bundles",
      permission: "bundles:view",
      icon: <Layers size={20} className="text-indigo-600" />,
      badge: undefined as string | undefined,
    },
    {
      label: "ኢንሴንቲቭ አፅድቅ",
      desc: "የተሰላ የሠራተኞች ኢንሴንቲቭ ክፍያ ማረጋገጫ",
      href: "/incentive",
      permission: "incentive:approve",
      icon: <TrendingUp size={20} className="text-emerald-600" />,
      badge: "ማኔጅመንት",
    },
  ] as const;

  const visible = actions.filter((a) =>
    hasPermission(role as Parameters<typeof hasPermission>[0], a.permission)
  );

  if (!visible.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-ethiopic flex items-center gap-2">
          <span>⚡</span>
          <span>ፈጣን የስራ ተግባራት (Quick Actions)</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {visible.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="erp-card p-4 hover:shadow-md hover:border-blue-300 transition-all duration-150 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-slate-50 group-hover:bg-blue-50 transition-colors">
                  {a.icon}
                </div>
                {a.badge && (
                  <span className="text-[10px] font-semibold font-ethiopic px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700">
                    {a.badge}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-800 text-sm font-ethiopic group-hover:text-blue-600 transition-colors">
                {a.label}
              </h3>
              <p className="text-xs text-slate-500 font-ethiopic mt-1 leading-relaxed">
                {a.desc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-semibold font-ethiopic">
              <span>ወደ ስራው ሂድ</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
