import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import Link from "next/link";

const STAGE_AM: Record<string, string> = {
  RECEIVING:"ጥሬ እቃ", CUTTING:"ቆረጣ", SEWING:"ስፌት",
  TRIMMING:"ለቀማ", QUALITY_CONTROL:"ጥራት", STYLING_HITPRESS:"ሂትፕረስ",
  IRONING:"ካውያ", PACKING:"ማሸግ", DELIVERY:"ማድረስ",
};

export default async function OrderStatusReportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "reports:view");

  const params     = await searchParams;
  const activeOnly = params.status !== "all";
  const today      = new Date();
  today.setHours(0, 0, 0, 0);

  const orders = await db.prodOrder.findMany({
    where: { ...(activeOnly ? { isActive: true } : {}) },
    include: {
      style: true,
      cutJobs: {
        include: {
          bundles: { select: { id: true, currentStage: true } },
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  const overdueCount = orders.filter(
    (o) => o.isActive && o.dueDate && o.dueDate < today
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-gray-500 mb-1">
            <Link href="/reports" className="hover:underline font-ethiopic">ሪፖርቶች</Link> /
          </p>
          <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{am.reports.ORDER_STATUS}</h1>
          {overdueCount > 0 && (
            <p className="text-sm text-red-600 font-ethiopic mt-0.5">{overdueCount} ዘግይቶ ≥ ዛሬ ⚠️</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/reports/orders"
            className={`px-4 py-2 rounded-xl text-sm font-ethiopic transition-colors ${activeOnly ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            ንቁ
          </Link>
          <Link href="/reports/orders?status=all"
            className={`px-4 py-2 rounded-xl text-sm font-ethiopic transition-colors ${!activeOnly ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            ሁሉም
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SC label="ጠቅ. ትዕዛዞች"  value={String(orders.length)} />
        <SC label="ዘግይቶ"         value={String(overdueCount)}
          color={overdueCount > 0 ? "text-red-600" : "text-green-700"} />
        <SC label="ቆርጦ ጀምሯቸዋል"
          value={String(orders.filter((o) => o.cutJobs.length > 0).length)} />
        <SC label="ባንድሎች"
          value={String(orders.reduce((s, o) =>
            s + o.cutJobs.reduce((s2, cj) => s2 + cj.bundles.length, 0), 0
          ))} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm data-table">
          <thead>
            <tr>
              <th>ትዕዛዝ #</th>
              <th>ስታይል</th>
              <th>ደምበኛ</th>
              <th>መጠን</th>
              <th>ማብቂያ</th>
              <th>ያሉ ደረጃዎች</th>
              <th>{am.status}</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400 font-ethiopic">{am.noData}</td></tr>
            )}
            {orders.map((order) => {
              const isOverdue = order.isActive && order.dueDate && order.dueDate < today;
              // Collect all bundle stages
              const stageCounts: Record<string, number> = {};
              for (const cj of order.cutJobs) {
                for (const b of cj.bundles) {
                  stageCounts[b.currentStage] = (stageCounts[b.currentStage] ?? 0) + 1;
                }
              }
              const stageEntries = Object.entries(stageCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);

              return (
                <tr key={order.id} className={isOverdue ? "bg-red-50/40" : ""}>
                  <td>
                    <Link href={`/production/orders/${order.id}`}
                      className="font-mono text-xs font-medium text-blue-600 hover:underline">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="font-ethiopic text-gray-800">{order.style.nameAm}</td>
                  <td className="text-gray-600 text-sm">{order.customer ?? "—"}</td>
                  <td className="tabular-nums text-center">{order.quantity.toLocaleString()}</td>
                  <td className={`font-ethiopic text-sm ${isOverdue ? "text-red-600 font-semibold" : "text-gray-600"}`}>
                    {order.dueDate ? formatAsEthDate(order.dueDate) : "—"}
                    {isOverdue && " ⚠️"}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {stageEntries.length === 0 ? (
                        <span className="text-xs text-gray-400 font-ethiopic">ቆርጦ አልጀመረም</span>
                      ) : stageEntries.map(([stage, count]) => (
                        <span key={stage} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-ethiopic tabular-nums">
                          {STAGE_AM[stage] ?? stage}: {count}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-ethiopic ${order.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {order.isActive ? "ንቁ" : "ተጠናቋል"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SC({ label, value, color = "text-gray-800" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-500 font-ethiopic mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
