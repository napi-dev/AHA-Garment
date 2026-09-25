import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import Link from "next/link";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import { Plus } from "lucide-react";

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "bundles:view");

  const params = await searchParams;
  const activeOnly = params.status !== "all";

  const orders = await db.prodOrder.findMany({
    where: { ...(activeOnly ? { isActive: true } : {}) },
    include: {
      style: true,
      cutJobs: {
        include: {
          bundles: {
            select: { id: true, currentStage: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const today = new Date();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">ምርት ትዕዛዞች</h1>
        <div className="flex gap-2">
          <Link href="/production/styles"
            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-ethiopic hover:bg-gray-200 transition-colors">
            ስታይሎች
          </Link>
          <Link href="/production/orders/new"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors font-ethiopic">
            <Plus size={16} /> ትዕዛዝ ጨምር
          </Link>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Link href="/production"
          className={`px-4 py-2 rounded-lg text-sm font-ethiopic transition-colors ${activeOnly ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
          ንቁ ትዕዛዞች
        </Link>
        <Link href="/production?status=all"
          className={`px-4 py-2 rounded-lg text-sm font-ethiopic transition-colors ${!activeOnly ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
          ሁሉም
        </Link>
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm data-table">
          <thead>
            <tr>
              <th>ትዕዛዝ #</th>
              <th>ስታይል</th>
              <th className="w-20">መጠን</th>
              <th className="w-24">ደምበኛ</th>
              <th className="w-28">ማብቂያ ቀን</th>
              <th className="w-20">ባንድሎች</th>
              <th className="w-24">{am.status}</th>
              <th className="w-20">{am.actions}</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400 font-ethiopic">{am.noData}</td></tr>
            )}
            {orders.map((order) => {
              const totalBundles = order.cutJobs.reduce((s, cj) => s + cj.bundles.length, 0);
              const isOverdue = order.dueDate && order.dueDate < today && order.isActive;
              return (
                <tr key={order.id} className={isOverdue ? "bg-red-50/40" : ""}>
                  <td className="font-mono text-xs font-medium text-gray-700">{order.orderNumber}</td>
                  <td className="font-ethiopic text-gray-800 font-medium">{order.style.nameAm}</td>
                  <td className="tabular-nums text-center">{order.quantity.toLocaleString()}</td>
                  <td className="text-gray-600">{order.customer ?? "—"}</td>
                  <td className={`font-ethiopic text-sm ${isOverdue ? "text-red-600 font-semibold" : "text-gray-600"}`}>
                    {order.dueDate ? formatAsEthDate(order.dueDate) : "—"}
                    {isOverdue && " ⚠️"}
                  </td>
                  <td className="text-center tabular-nums">{totalBundles}</td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-ethiopic ${order.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {order.isActive ? "ንቁ" : "ተጠናቋል"}
                    </span>
                  </td>
                  <td>
                    <Link href={`/production/orders/${order.id}`}
                      className="text-xs text-blue-600 hover:underline font-ethiopic">ይመልከቱ</Link>
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
