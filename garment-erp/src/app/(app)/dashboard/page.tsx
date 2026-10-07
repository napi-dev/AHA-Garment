import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate, ethMonthName } from "@/lib/ethiopian-calendar";
import { getEffectiveDate, getEffectiveEthDate } from "@/lib/date-override/effective-date";
import { redirect } from "next/navigation";
import { getPageAccess, canCloseIncentive, canApproveIncentive } from "@/lib/auth/permissions";
import { DashboardCharts } from "./dashboard-charts";
import Decimal from "decimal.js";
import Link from "next/link";
import {
  Factory, AlertTriangle, Clock, Layers,
  Scissors, Package, TrendingUp, CheckCircle2,
  Calendar, ArrowRight, CheckSquare,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { role, nameAm } = session.user;

  const today = await getEffectiveDate();
  today.setUTCHours(0, 0, 0, 0);
  const eth = await getEffectiveEthDate();

  // ── Today's stats — all in one Promise.all ────────────────────────────────
  const [dayClose, countStats, aboveTarget, openAlerts, pendingPeriods] =
    await Promise.all([
      db.dayClose.findUnique({ where: { date: today } }),
      db.hourlyBox.aggregate({
        where: { date: today },
        _count: { _all: true },
        _sum:   { totalProduced: true, plusPieces: true },
      }),
      db.hourlyBox.count({
        where: { date: today, plusPieces: { gt: 0 } },
      }),
      db.alert.count({ where: { resolvedAt: null } }),
      canApproveIncentive(role)
        ? db.incentivePeriod.count({ where: { status: "PENDING_APPROVAL" } })
        : Promise.resolve(0),
    ]);

  // ── 14-day trend — single query, aggregated in memory ────────────────────
  const trendDays = 14;
  const trendStart = new Date(today);
  trendStart.setDate(trendStart.getDate() - trendDays + 1);

  // Get LOCKED days to see which days have real closed data
  const closedDays = await db.dayClose.findMany({
    where: { date: { gte: trendStart, lte: today } },
    select: { date: true },
  });
  const closedDaySet = new Set(closedDays.map(d => d.date.toISOString().split("T")[0]));

  const trendRaw = await db.hourlyBox.findMany({
    where: { date: { gte: trendStart, lte: today } },
    select: { date: true, totalProduced: true, plusPieces: true },
  });

  const trendMap = new Map<string, { produced: number; plus: number }>();
  let grandTotalProduced = 0;
  for (const row of trendRaw) {
    const key = row.date.toISOString().split("T")[0];
    const prev = trendMap.get(key) ?? { produced: 0, plus: 0 };
    prev.produced += row.totalProduced ?? 0;
    prev.plus     += row.plusPieces    ?? 0;
    trendMap.set(key, prev);
    grandTotalProduced += row.totalProduced ?? 0;
  }

  const trendPerDay: { date: string; produced: number; plus: number }[] = [];
  for (let i = 0; i < trendDays; i++) {
    const d = new Date(trendStart);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split("T")[0];
    const agg = trendMap.get(key) ?? { produced: 0, plus: 0 };
    
    // Format as Ethiopian date: "14 መስከረም"
    const ethDate = await import("@/lib/ethiopian-calendar").then(m => m.dateToEth(d));
    const monthName = ethMonthName(ethDate.month);
    const dateLabel = `${ethDate.day} ${monthName}`;
    
    trendPerDay.push({ date: dateLabel, produced: agg.produced, plus: agg.plus });
  }

  // ── Remaining queries — all parallel ──────────────────────────────────────
  const [currentPeriod, deptStatsRaw, [openOrders, overdueOrders], upcomingDeadlines] =
    await Promise.all([
      canCloseIncentive(role) || canApproveIncentive(role)
        ? db.incentivePeriod.findFirst({
            where: { ethYear: eth.year, ethMonth: eth.month },
            orderBy: { periodNumber: "desc" },
          })
        : Promise.resolve(null),
      db.hourlyBox.groupBy({
        by:   ["departmentId"],
        where: { date: today },
        _sum:  { totalProduced: true, plusPieces: true, targetForDay: true },
      }),
      Promise.all([
        db.prodOrder.count({ where: { status: "ACTIVE" } }),
        db.prodOrder.count({ where: { status: "ACTIVE", deadlineAt: { lt: today } } }),
      ]),
      // Get orders with upcoming deadlines (3 days, 2 days, 1 day)
      ["ADMIN", "PRODUCTION_MANAGER", "ORDER_PLACER"].includes(role)
        ? db.prodOrder.findMany({
            where: {
              status: "ACTIVE",
              deadlineAt: { gte: today },
            },
            select: { id: true, orderNo: true, deadlineAt: true },
            orderBy: { deadlineAt: "asc" },
          })
        : Promise.resolve([]),
    ]);

  // ── Incentive cost ────────────────────────────────────────────────────────
  let incentiveCostPer1000 = "—";
  let periodPayable = "—";
  if (currentPeriod) {
    const agg = await db.incentiveLine.aggregate({
      where: { periodId: currentPeriod.id },
      _sum:  { payable: true },
    });
    const totalPay = new Decimal(agg._sum.payable?.toString() ?? "0");
    periodPayable = totalPay.toFixed(2);
    incentiveCostPer1000 =
      grandTotalProduced > 0
        ? totalPay.div(grandTotalProduced).mul(1000).toFixed(2)
        : "—";
  }

  // ── Dept chart — resolve names ────────────────────────────────────────────
  const deptIds = deptStatsRaw.map((d) => d.departmentId);
  const deptRows = deptIds.length
    ? await db.department.findMany({
        where:  { id: { in: deptIds } },
        select: { id: true, nameAm: true },
      })
    : [];
  const deptNameMap = Object.fromEntries(deptRows.map((d) => [d.id, d.nameAm]));

  const deptChartData = deptStatsRaw
    .map((d) => ({
      name:     deptNameMap[d.departmentId] ?? d.departmentId.slice(0, 8),
      target:   d._sum.targetForDay  ?? 0,
      produced: d._sum.totalProduced ?? 0,
    }))
    .filter((d) => d.target > 0)
    .sort((a, b) => b.produced - a.produced)
    .slice(0, 10);

  // ── Calculate order deadlines (3/2/1 days) ───────────────────────────────
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  let orders3Days = 0;
  let orders2Days = 0;
  let orders1Day = 0;
  
  for (const order of upcomingDeadlines) {
    const deadline = new Date(order.deadlineAt);
    deadline.setHours(0, 0, 0, 0);
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining === 3) orders3Days++;
    else if (daysRemaining === 2) orders2Days++;
    else if (daysRemaining === 1) orders1Day++;
  }

  const totalWorkersAttended = countStats._count._all;
  const canCloseDay = !dayClose && getPageAccess(role, "/counts/close") !== "none";
  const showOrderCountdown = ["ADMIN", "PRODUCTION_MANAGER", "ORDER_PLACER"].includes(role);

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-ethiopic text-blue-200 border border-white/10">
              <Calendar size={13} className="text-blue-300" />
              <span>{eth.day} {ethMonthName(eth.month)} {eth.year} ዓ.ም</span>
              <span>·</span>
              <span>{formatAsEthDate(today)}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-ethiopic tracking-tight">
              እንኳን ደህና መጡ፣ {nameAm}
            </h1>
            <p className="text-slate-300 text-sm font-ethiopic max-w-xl">
              AHA GARMENT — ዕለታዊ የምርት ፍሰት፣ የሠራተኞች መገኘትና የጥራት ቁጥጥር ዳሽቦርድ
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!dayClose && canCloseDay && (
              <Link href="/counts/close"
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-ethiopic font-semibold text-sm hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg flex items-center gap-2 animate-pulse">
                <CheckSquare size={16} />
                <span>{am.counts.closeDay}</span>
              </Link>
            )}
            <Link href="/counts/enter"
              className="px-5 py-3 rounded-2xl bg-white text-slate-900 font-ethiopic font-semibold text-sm hover:bg-slate-100 transition-all shadow-md flex items-center gap-2">
              <Clock size={16} className="text-blue-600" />
              <span>{am.counts.enterCount}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="erp-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">{am.dashboard.todayProduction}</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Factory size={18} /></div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold text-slate-900 tabular-nums">
              {(countStats._sum.totalProduced ?? 0).toLocaleString()}
              <span className="text-xs font-normal text-slate-400 ml-1 font-ethiopic">ፍሬ</span>
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-ethiopic">
              {dayClose ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 size={13} /> የዕለት ሥራ ተጠቃልሎ ተዘግቷል
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                  <Clock size={13} /> የዕለት ሥራ ክፍት ነው
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="erp-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">{am.dashboard.workersAboveTarget}</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><TrendingUp size={18} /></div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold text-emerald-600 tabular-nums">
              {aboveTarget}
              <span className="text-xs font-normal text-slate-400 ml-1 font-ethiopic">ሠራተኞች</span>
            </p>
            <p className="mt-2 text-xs text-slate-500 font-ethiopic">ከቀረቡት {totalWorkersAttended} ሠራተኞች መካከል</p>
          </div>
        </div>

        <div className="erp-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">ንቁ የምርት ትዕዛዞች</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><Layers size={18} /></div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold text-slate-900 tabular-nums">
              {openOrders}
              <span className="text-xs font-normal text-slate-400 ml-1 font-ethiopic">ትዕዛዞች</span>
            </p>
            <p className="mt-2 text-xs font-ethiopic">
              {overdueOrders > 0 ? (
                <span className="text-rose-600 font-medium flex items-center gap-1">
                  <AlertTriangle size={12} /> {overdueOrders} የዘገዩ ትዕዛዞች አሉ
                </span>
              ) : (
                <span className="text-slate-500">ሁሉም ትዕዛዞች በጊዜ ሂደት ላይ ናቸው</span>
              )}
            </p>
          </div>
        </div>

        <div className="erp-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">{am.dashboard.openAlerts}</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${openAlerts > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className={`text-3xl font-bold tabular-nums ${openAlerts > 0 ? "text-rose-600" : "text-emerald-600"}`}>{openAlerts}</p>
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

      {/* Order Countdown Warnings (Admin, Production Manager, Order Placer) */}
      {showOrderCountdown && (orders3Days > 0 || orders2Days > 0 || orders1Day > 0) && (
        <div className="erp-card p-6 border-l-4 border-amber-500 bg-gradient-to-r from-amber-50/50 to-orange-50/30">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-amber-600" />
            <h3 className="text-base font-bold text-slate-900 font-ethiopic">
              የትዕዛዝ ማጠናቀቂያ ማስታወሻዎች
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {orders3Days > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-green-200">
                <div className="text-3xl">🟢</div>
                <div>
                  <p className="text-2xl font-bold text-green-700 tabular-nums">{orders3Days}</p>
                  <p className="text-xs text-slate-600 font-ethiopic font-medium">በ3 ቀናት ውስጥ</p>
                  <p className="text-[10px] text-slate-400 font-ethiopic mt-0.5">የቆረጣ ዝግጅት ጀምር</p>
                </div>
              </div>
            )}
            {orders2Days > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-yellow-300">
                <div className="text-3xl">🟡</div>
                <div>
                  <p className="text-2xl font-bold text-yellow-700 tabular-nums">{orders2Days}</p>
                  <p className="text-xs text-slate-600 font-ethiopic font-medium">በ2 ቀናት ውስጥ</p>
                  <p className="text-[10px] text-slate-400 font-ethiopic mt-0.5">የስፌት መስመር አረጋግጥ</p>
                </div>
              </div>
            )}
            {orders1Day > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white border-2 border-red-400 shadow-sm animate-pulse">
                <div className="text-3xl">🔴</div>
                <div>
                  <p className="text-2xl font-bold text-red-700 tabular-nums">{orders1Day}</p>
                  <p className="text-xs text-red-600 font-ethiopic font-bold">በ1 ቀን ውስጥ!</p>
                  <p className="text-[10px] text-red-500 font-ethiopic mt-0.5 font-semibold">የፊኒሺንግ ፍጥነት ጨምር!</p>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-amber-200">
            <Link href="/production/orders" className="text-xs text-amber-700 hover:text-amber-900 font-ethiopic font-semibold hover:underline inline-flex items-center gap-1">
              ሁሉንም ትዕዛዞች ለማየት ይጫኑ <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      )}

      {/* Incentive / pending KPIs */}
      {(canCloseIncentive(role) || canApproveIncentive(role) || pendingPeriods > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {(canCloseIncentive(role) || canApproveIncentive(role)) && (
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
                <p className="text-xs text-slate-400 font-ethiopic mt-1">የምርት ውጤታማነት ወጪ ንፅፅር</p>
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

      {/* Charts */}
      <DashboardCharts trendData={trendPerDay} deptData={deptChartData} role={role} />

      {/* Quick actions */}
      <QuickActions role={role} />
    </div>
  );
}

function QuickActions({ role }: { role: string }) {
  const r = role as import("@prisma/client").Role;
  const { getPageAccess } = require("@/lib/auth/permissions");
  
  const actions = [
    { label: "የሰዓት ቁጥር መዝግብ",   desc: "የእያንዳንዱን ሠራተኛ የሰዓት ውጤት አስገባ",        href: "/counts/enter",       page: "/counts/enter",       icon: <Clock size={20} className="text-blue-600" />,    badge: "ዕለታዊ" as string | undefined },
    { label: "የዕለት ሥራ አጠቃልል",  desc: "የዕለቱን የምርት ሰሌዳ ፈትሽና ዝጋ",            href: "/counts/close",       page: "/counts/close",       icon: <CheckSquare size={20} className="text-purple-600" />, badge: "ቀን ማጠቃለያ" as string | undefined },
    { label: "አዲስ ቆረጣ ጀምር",    desc: "ለጨርቅ ቆረጣ ክፍል ትዕዛዝ መዝግብ",           href: "/cutting/new",        page: "/cutting",            icon: <Scissors size={20} className="text-orange-600" />, badge: undefined },
    { label: "ጥሬ ዕቃ ገቢ አድርግ",  desc: "የመጡ አዳዲስ ጥሬ ዕቃዎችን አስመዝግብ",         href: "/materials",          page: "/materials",          icon: <Package size={20} className="text-teal-600" />,   badge: undefined },
    { label: "ኢንሴንቲቭ አፅድቅ",    desc: "የተሰላ የሠራተኞች ኢንሴንቲቭ ክፍያ ማረጋገጫ",     href: "/incentive",          page: "/incentive",          icon: <TrendingUp size={20} className="text-emerald-600" />, badge: "ማኔጅመንት" as string | undefined },
  ];

  const visible = actions.filter((a) => getPageAccess(r, a.page) !== "none");
  if (!visible.length) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-ethiopic flex items-center gap-2">
        <span>⚡</span><span>ፈጣን የስራ ተግባራት (Quick Actions)</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {visible.map((a) => (
          <Link key={a.href} href={a.href}
            className="erp-card p-4 hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-slate-50 group-hover:bg-blue-50 transition-colors">{a.icon}</div>
                {a.badge && (
                  <span className="text-[10px] font-semibold font-ethiopic px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700">
                    {a.badge}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-800 text-sm font-ethiopic group-hover:text-blue-600 transition-colors">{a.label}</h3>
              <p className="text-xs text-slate-500 font-ethiopic mt-1 leading-relaxed">{a.desc}</p>
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
