import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import { resolveAlertAction } from "./actions";

const TYPE_LABELS: Record<string, string> = {
  LOW_STOCK:      am.alerts.LOW_STOCK,
  WASTAGE:        am.alerts.WASTAGE,
  DELAYED_ORDER:  am.alerts.DELAYED_ORDER,
  REPORT_FAILED:  am.alerts.REPORT_FAILED,
  DAY_NOT_CLOSED: am.alerts.DAY_NOT_CLOSED,
  UNUSUAL_COUNT:  am.alerts.UNUSUAL_COUNT,
};

const TYPE_COLOR: Record<string, string> = {
  LOW_STOCK:     "bg-orange-100 text-orange-700",
  WASTAGE:       "bg-red-100 text-red-700",
  DELAYED_ORDER: "bg-yellow-100 text-yellow-700",
  REPORT_FAILED: "bg-red-200 text-red-800",
  DAY_NOT_CLOSED:"bg-amber-100 text-amber-700",
  UNUSUAL_COUNT: "bg-purple-100 text-purple-700",
};

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ resolved?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "reports:view");

  const params = await searchParams;
  const showResolved = params.resolved === "1";

  const alerts = await db.alert.findMany({
    where: { ...(showResolved ? {} : { resolvedAt: null }) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const openCount = await db.alert.count({ where: { resolvedAt: null } });
  const canResolve = ["ADMIN", "SUPER_MANAGER"].includes(session.user.role);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">ማስጠንቀቂያዎች</h1>
          {openCount > 0 && (
            <p className="text-sm text-red-600 font-ethiopic mt-0.5">{openCount} ክፍት ማስጠንቀቂያዎች</p>
          )}
        </div>
        <div className="flex gap-2">
          <a href="/alerts"
            className={`px-4 py-2 rounded-xl text-sm font-ethiopic transition-colors ${!showResolved ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            ክፍት ({openCount})
          </a>
          <a href="/alerts?resolved=1"
            className={`px-4 py-2 rounded-xl text-sm font-ethiopic transition-colors ${showResolved ? "bg-gray-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            የተፈቱ
          </a>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 && (
          <div className="bg-green-50 rounded-2xl p-10 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-ethiopic text-green-700 text-lg font-semibold">
              {showResolved ? "ምንም የተፈቱ ማስጠንቀቂያዎች የሉም" : "ምንም ክፍት ማስጠንቀቂያ የለም"}
            </p>
          </div>
        )}

        {alerts.map((alert) => {
          const action = canResolve ? resolveAlertAction.bind(null, alert.id) : null;
          return (
            <div key={alert.id}
              className={`bg-white rounded-2xl shadow-sm border p-5 flex items-start justify-between gap-4 ${alert.resolvedAt ? "opacity-60 border-gray-100" : "border-gray-200"}`}>
              <div className="flex gap-3 min-w-0">
                <span className={`flex-shrink-0 text-xs px-2 py-1 rounded-full font-ethiopic h-fit mt-0.5 ${TYPE_COLOR[alert.type] ?? "bg-gray-100 text-gray-700"}`}>
                  {TYPE_LABELS[alert.type] ?? alert.type}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 font-ethiopic whitespace-pre-line leading-relaxed">
                    {alert.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {formatAsEthDate(alert.createdAt)}
                    {" · "}
                    {alert.createdAt.toLocaleTimeString("en-ET", { hour: "2-digit", minute: "2-digit" })}
                    {alert.resolvedAt && (
                      <span className="ml-2 text-green-600 font-ethiopic">
                        ✓ ተፈትቷል {formatAsEthDate(alert.resolvedAt)}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {!alert.resolvedAt && canResolve && action && (
                <form action={action} className="flex-shrink-0">
                  <button
                    className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors font-ethiopic whitespace-nowrap">
                    ፍታ
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
