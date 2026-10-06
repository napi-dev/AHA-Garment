import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getPageAccess, canResolveAlert, canSeeAlert } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import { resolveAlertAction } from "./actions";
import { Bell, BellOff, AlertTriangle, CheckCircle2 } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  LOW_STOCK:          am.alerts.LOW_STOCK,
  WASTAGE:            am.alerts.WASTAGE,
  CONSUMPTION:        am.alerts.CONSUMPTION,
  DELAYED_ORDER:      am.alerts.DELAYED_ORDER,
  ORDER_COUNTDOWN:    am.alerts.ORDER_COUNTDOWN,
  FLOW_VARIANCE:      am.alerts.FLOW_VARIANCE,
  SHOP_SOLD_OUT:      am.alerts.SHOP_SOLD_OUT,
  ATTENDANCE_MISSING: am.alerts.ATTENDANCE_MISSING,
  REPORT_FAILED:      am.alerts.REPORT_FAILED,
  DAY_NOT_CLOSED:     am.alerts.DAY_NOT_CLOSED,
  UNUSUAL_COUNT:      am.alerts.UNUSUAL_COUNT,
  HR_CASE:            am.alerts.HR_CASE,
  SALARY_CHANGED:     am.alerts.SALARY_CHANGED,
};

const TYPE_COLOR: Record<string, string> = {
  LOW_STOCK:          "bg-orange-100 text-orange-700",
  WASTAGE:            "bg-red-100 text-red-700",
  CONSUMPTION:        "bg-rose-100 text-rose-700",
  DELAYED_ORDER:      "bg-yellow-100 text-yellow-700",
  ORDER_COUNTDOWN:    "bg-amber-100 text-amber-700",
  FLOW_VARIANCE:      "bg-blue-100 text-blue-700",
  SHOP_SOLD_OUT:      "bg-orange-100 text-orange-700",
  ATTENDANCE_MISSING: "bg-red-100 text-red-700",
  REPORT_FAILED:      "bg-red-200 text-red-800",
  DAY_NOT_CLOSED:     "bg-amber-100 text-amber-700",
  UNUSUAL_COUNT:      "bg-purple-100 text-purple-700",
  HR_CASE:            "bg-indigo-100 text-indigo-700",
  SALARY_CHANGED:     "bg-emerald-100 text-emerald-700",
};

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ resolved?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  
  const access = getPageAccess(session.user.role, "/alerts");
  if (access === "none") redirect("/dashboard");

  const params = await searchParams;
  const showResolved = params.resolved === "1";

  // Count open alerts first — if none and not showing resolved, skip the full query
  const openCount = await db.alert.count({ where: { resolvedAt: null } });

  // Only fetch alert types this role can see
  const alerts = openCount > 0 || showResolved
    ? await db.alert.findMany({
        where: { ...(showResolved ? {} : { resolvedAt: null }) },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    : [];

  // Filter alerts by role visibility
  const visibleAlerts = alerts.filter((a) => canSeeAlert(session.user.role, a.type));
  const canResolve = canResolveAlert(session.user.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="erp-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-red-600 uppercase tracking-wider font-ethiopic">
            <Bell size={14} />
            <span>ማስጠንቀቂያዎች ክፍል</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">ማስጠንቀቂያዎች</h1>
          {openCount > 0 ? (
            <p className="text-sm text-red-600 font-ethiopic mt-0.5 font-semibold">{openCount} ክፍት ማስጠንቀቂያዎች</p>
          ) : (
            <p className="text-sm text-green-600 font-ethiopic mt-0.5">ምንም ክፍት ማስጠንቀቂያ የለም</p>
          )}
        </div>
        <div className="flex gap-2">
          <a href="/alerts"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-ethiopic transition-colors font-semibold ${!showResolved ? "bg-red-600 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
            <Bell size={14} /> ክፍት ({openCount})
          </a>
          <a href="/alerts?resolved=1"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-ethiopic transition-colors font-semibold ${showResolved ? "bg-slate-700 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
            <BellOff size={14} /> የተፈቱ
          </a>
        </div>
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {visibleAlerts.length === 0 && (
          <div className="erp-card p-12 text-center">
            <CheckCircle2 size={44} className="mx-auto text-green-400 mb-3" />
            <p className="font-ethiopic text-green-700 text-lg font-semibold">
              {showResolved ? "ምንም የተፈቱ ማስጠንቀቂያዎች የሉም" : "ምንም ክፍት ማስጠንቀቂያ የለም"}
            </p>
          </div>
        )}

        {visibleAlerts.map((alert) => {
          const action = canResolve ? resolveAlertAction.bind(null, alert.id) : null;
          return (
            <div key={alert.id}
              className={`erp-card p-5 flex items-start justify-between gap-4 ${alert.resolvedAt ? "opacity-60" : ""}`}>
              <div className="flex gap-3 min-w-0">
                <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-ethiopic font-semibold h-fit mt-0.5 ${TYPE_COLOR[alert.type] ?? "bg-slate-100 text-slate-700"}`}>
                  {TYPE_LABELS[alert.type] ?? alert.type}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-slate-800 font-ethiopic whitespace-pre-line leading-relaxed">
                    {alert.message}
                  </p>
                  <p className="text-xs text-slate-400 mt-1.5">
                    {formatAsEthDate(alert.createdAt)}
                    {" · "}
                    {alert.createdAt.toLocaleTimeString("en-ET", { hour: "2-digit", minute: "2-digit" })}
                    {alert.resolvedAt && (
                      <span className="ml-2 text-green-600 font-ethiopic font-semibold">
                        ✓ ተፈትቷል {formatAsEthDate(alert.resolvedAt)}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {!alert.resolvedAt && canResolve && action && (
                <form action={action} className="flex-shrink-0">
                  <button
                    className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded-xl hover:bg-green-100 transition-colors font-ethiopic whitespace-nowrap font-semibold">
                    ✓ ፍታ
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
