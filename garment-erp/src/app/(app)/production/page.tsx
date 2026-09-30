import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import Link from "next/link";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import { Factory, Plus, Palette, Layers, Clock, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";

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

  // Use EAT (UTC+3) so overdue comparison matches Ethiopia's current date
  const eatOffset = 3 * 60 * 60 * 1000;
  const eatNow    = new Date(Date.now() + eatOffset);
  const today     = new Date(Date.UTC(eatNow.getUTCFullYear(), eatNow.getUTCMonth(), eatNow.getUTCDate(), 0, 0, 0));

  const [activeCount, totalCount, overdueCount] = await Promise.all([
    db.prodOrder.count({ where: { isActive: true } }),
    db.prodOrder.count(),
    db.prodOrder.count({ where: { isActive: true, dueDate: { lt: today } } }),
  ]);

  const totalPiecesTarget = orders.reduce((sum, o) => sum + o.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="erp-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
            <Factory size={14} />
            <span>የምርት ሂደትና የስፌት መስመሮች</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
            {am.production.title}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-ethiopic">
            የምርት ትዕዛዞች፣ የልብስ ስታይሎች እና የባንድሎች የእድገት ደረጃ ክትትል
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/production/bundles"
            className="btn-secondary flex items-center gap-2 font-ethiopic"
          >
            <Layers size={15} />
            <span>{am.production.bundles}</span>
          </Link>

          <Link
            href="/production/styles"
            className="btn-secondary flex items-center gap-2 font-ethiopic"
          >
            <Palette size={15} />
            <span>{am.production.styles}</span>
          </Link>

          <Link
            href="/production/orders/new"
            className="btn-primary flex items-center gap-2 font-ethiopic"
          >
            <Plus size={16} />
            <span>{am.production.newOrder}</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">በሂደት ላይ ያሉ ትዕዛዞች</p>
            <Factory size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700 tabular-nums">{activeCount}</p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">የታለመ የምርት ብዛት</p>
            <Layers size={16} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{totalPiecesTarget.toLocaleString()} <span className="text-xs font-normal">ፍሬ</span></p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">የዘገዩ ትዕዛዞች</p>
            <AlertTriangle size={16} className={overdueCount > 0 ? "text-rose-500" : "text-slate-400"} />
          </div>
          <p className={`text-2xl font-bold tabular-nums ${overdueCount > 0 ? "text-rose-600" : "text-slate-800"}`}>
            {overdueCount}
          </p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">ጠቅላላ የተመዘገቡ</p>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{totalCount}</p>
        </div>
      </div>

      {overdueCount > 0 && (
        <div className="alert-warning flex items-center gap-2 font-ethiopic text-xs">
          <AlertTriangle size={16} className="text-amber-700 flex-shrink-0" />
          <span>{overdueCount} የምርት ትዕዛዞች የማጠናቀቂያ ቀናቸው ያለፈባቸው ናቸው። ቅድሚያ ሰጥተው ያጠናቁ!</span>
        </div>
      )}

      {/* Filter Tabs Card */}
      <div className="erp-card p-4 flex items-center gap-2">
        <Link
          href="/production"
          className={`px-4 py-2 rounded-xl text-xs font-semibold font-ethiopic transition-all ${activeOnly ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          በሂደት ላይ ያሉ ንቁ ትዕዛዞች ({activeCount})
        </Link>
        <Link
          href="/production?status=all"
          className={`px-4 py-2 rounded-xl text-xs font-semibold font-ethiopic transition-all ${!activeOnly ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          ሁሉንም ትዕዛዞች አሳይ ({totalCount})
        </Link>
      </div>

      {/* Orders Table */}
      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead>
              <tr>
                <th className="w-28 text-center">{am.production.orderNumber}</th>
                <th className="text-right">{am.production.styles}</th>
                <th className="w-28 text-center">{am.production.targetQuantity}</th>
                <th className="text-right">{am.production.client}</th>
                <th className="text-right">{am.production.deadline}</th>
                <th className="text-center">ባንድሎች</th>
                <th className="w-24 text-center">{am.status}</th>
                <th className="w-24 text-center">{am.actions}</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400 font-ethiopic">
                    <Factory size={36} className="mx-auto mb-2 text-slate-300" />
                    <p>{am.noData}</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const totalBundles = order.cutJobs.reduce((s, cj) => s + cj.bundles.length, 0);
                  const isOverdue = order.dueDate && order.dueDate < today && order.isActive;
                  return (
                    <tr key={order.id} className={isOverdue ? "bg-rose-50/50 hover:bg-rose-50/80" : "hover:bg-slate-50/80 transition-colors"}>
                      <td className="font-mono text-xs font-semibold text-slate-700 text-center py-3.5">
                        <span className="bg-slate-100 px-2 py-0.5 rounded">
                          {order.orderNumber}
                        </span>
                      </td>
                      <td className="font-ethiopic font-semibold text-slate-900 text-right py-3.5">
                        {order.style.nameAm}
                      </td>
                      <td className="tabular-nums font-bold text-slate-800 text-center py-3.5">
                        {order.quantity.toLocaleString()}
                      </td>
                      <td className="font-ethiopic text-slate-600 text-right py-3.5 text-xs">
                        {order.customer ?? "—"}
                      </td>
                      <td className={`font-ethiopic text-xs text-right py-3.5 ${isOverdue ? "text-rose-600 font-semibold" : "text-slate-600"}`}>
                        {order.dueDate ? formatAsEthDate(order.dueDate) : "—"}
                        {isOverdue && <span className="ml-1 text-rose-500 font-bold">⚠️ ያለፈበት</span>}
                      </td>
                      <td className="text-center tabular-nums py-3.5 font-semibold text-slate-700">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-mono">
                          {totalBundles} ባንድል
                        </span>
                      </td>
                      <td className="text-center py-3.5">
                        {order.isActive ? (
                          <span className="badge-verified font-ethiopic">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            በሂደት ላይ
                          </span>
                        ) : (
                          <span className="badge-draft font-ethiopic">
                            ተጠናቋል
                          </span>
                        )}
                      </td>
                      <td className="text-center py-3.5">
                        <Link
                          href={`/production/orders/${order.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 font-ethiopic hover:underline"
                        >
                          <span>ዝርዝር</span>
                          <ChevronRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
