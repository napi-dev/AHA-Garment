import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate, todayEth, ethMonthName } from "@/lib/ethiopian-calendar";
import { hasPermission } from "@/lib/auth/permissions";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;
  const { role } = session.user;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Stats ─────────────────────────────────────────────────────────────────

  // Today's day close status
  const dayClose = await db.dayClose.findUnique({
    where: { date: today },
  });

  // Workers with entries today
  const countStats = await db.hourlyCountLine.aggregate({
    where: {
      sheet: { date: today },
      status: { not: "DRAFT" },
    },
    _count: { _all: true },
    _sum: { totalProduced: true, plusPieces: true },
  });

  const aboveTarget = await db.hourlyCountLine.count({
    where: { sheet: { date: today }, plusPieces: { gt: 0 } },
  });

  // Open alerts
  const openAlerts = await db.alert.count({
    where: { resolvedAt: null },
  });

  // Pending incentive approvals (Super Manager sees these)
  const pendingPeriods = hasPermission(role, "incentive:approve")
    ? await db.incentivePeriod.count({ where: { status: "PENDING_APPROVAL" } })
    : 0;

  // Low stock items
  const lowStockCount = hasPermission(role, "stock:view")
    ? (await db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "Material" m
        WHERE m."isActive" = true
          AND (
            SELECT COALESCE(SUM(
              CASE sm."type"
                WHEN 'RECEIVE' THEN sm.quantity
                WHEN 'RETURN' THEN sm.quantity
                WHEN 'ISSUE' THEN -sm.quantity
                ELSE 0
              END
            ), 0)
            FROM "StockMovement" sm WHERE sm."materialId" = m.id
          ) <= m."minimumLevel"
      `)[0]?.count ?? BigInt(0)
    : BigInt(0);

  const ethToday = todayEth();

  const stats = [
    {
      label: am.dashboard.todayProduction,
      value: countStats._sum.totalProduced?.toLocaleString() ?? "0",
      sub: dayClose ? "ቀን ተዘግቷል" : "ቀን አልተዘጋም",
      color: dayClose ? "text-green-600" : "text-amber-600",
    },
    {
      label: am.dashboard.workersAboveTarget,
      value: aboveTarget.toString(),
      sub: `${countStats._count._all} ቀረቡ`,
      color: "text-blue-600",
    },
    {
      label: am.dashboard.openAlerts,
      value: openAlerts.toString(),
      sub: openAlerts > 0 ? "ትኩረት ያስፈልጋቸዋል" : "ሁሉም ጥሩ ነው",
      color: openAlerts > 0 ? "text-red-600" : "text-green-600",
    },
    ...(hasPermission(role, "stock:view")
      ? [{
          label: am.materials.lowStock,
          value: lowStockCount.toString(),
          sub: "ዝቅተኛ ወሰን ላይ",
          color: Number(lowStockCount) > 0 ? "text-orange-600" : "text-green-600",
        }]
      : []),
    ...(hasPermission(role, "incentive:approve") && pendingPeriods > 0
      ? [{
          label: am.dashboard.pendingApprovals,
          value: pendingPeriods.toString(),
          sub: "ኢንሴንቲቭ ለማፅደቅ",
          color: "text-purple-600",
        }]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">
            {am.dashboard.title}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5 font-ethiopic">
            {ethToday.day} {ethMonthName(ethToday.month)} {ethToday.year} ዓ.ም
            <span className="mx-2">·</span>
            {formatAsEthDate(new Date())}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-ethiopic mb-1">{s.label}</p>
            <p className={`text-3xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-1 font-ethiopic">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick actions by role */}
      <QuickActions role={role} />
    </div>
  );
}

function QuickActions({ role }: { role: string }) {
  const actions = [
    { label: "ቁጥር አስገባ", href: "/counts/enter", permission: "counts:enter", color: "bg-blue-500" },
    { label: "ቁጥር አረጋግጥ", href: "/counts/verify", permission: "counts:verify", color: "bg-green-500" },
    { label: "ቀን ዝጋ",  href: "/counts/close", permission: "counts:verify", color: "bg-purple-500" },
    { label: "ቆረጣ ሪፖርት", href: "/cutting/new", permission: "cuts:edit", color: "bg-orange-500" },
    { label: "ጥሬ እቃ ተቀበል", href: "/materials/receive", permission: "stock:edit", color: "bg-teal-500" },
    { label: "ኢንሴንቲቭ አፅድቅ", href: "/incentive/approve", permission: "incentive:approve", color: "bg-emerald-500" },
  ] as const;

  const visible = actions.filter((a) =>
    hasPermission(role as Parameters<typeof hasPermission>[0], a.permission)
  );

  if (visible.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 font-ethiopic">
        ፈጣን ተግባራት
      </h2>
      <div className="flex flex-wrap gap-3">
        {visible.map((a) => (
          <a
            key={a.href}
            href={a.href}
            className={`${a.color} text-white px-5 py-3 rounded-xl font-ethiopic text-sm font-medium
              hover:opacity-90 active:scale-[0.97] transition-all shadow-sm`}
          >
            {a.label}
          </a>
        ))}
      </div>
    </div>
  );
}
