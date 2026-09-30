import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import Link from "next/link";
import { Factory, ArrowLeft, AlertTriangle, Layers, Calendar, CheckCircle2, Clock } from "lucide-react";

const STAGE_AM: Record<string, string> = {
  RECEIVING: "ጥሬ ዕቃ",
  CUTTING: "ቆረጣ",
  SEWING: "ስፌት",
  TRIMMING: "ለቀማ",
  QUALITY_CONTROL: "ጥራት",
  STYLING_HITPRESS: "ሂትፕረስ",
  IRONING: "ካውያ",
  PACKING: "ማሸግ",
  DELIVERY: "ማድረስ",
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
  // Use EAT (UTC+3) so overdue comparison matches Ethiopia's current date
  const eatOffset  = 3 * 60 * 60 * 1000;
  const eatNow     = new Date(Date.now() + eatOffset);
  const today      = new Date(Date.UTC(eatNow.getUTCFullYear(), eatNow.getUTCMonth(), eatNow.getUTCDate(), 0, 0, 0));

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

  const inCuttingCount = orders.filter((o) => o.cutJobs.length > 0).length;
  const totalBundles = orders.reduce((s, o) =>
    s + o.cutJobs.reduce((s2, cj) => s2 + cj.bundles.length, 0), 0
  );

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 font-ethiopic"
        >
          <ArrowLeft size={14} />
          <span>ወደ ሪፖርቶች ማጠቃለያ ተመለስ</span>
        </Link>
      </div>

      {/* Header & Filter Card */}
      <div className="erp-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
              <Factory size={14} />
              <span>የትዕዛዞች ክትትል</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
              {am.reports.ORDER_STATUS}
            </h1>
            <p className="text-slate-500 font-ethiopic text-sm mt-0.5">
              የትዕዛዞች ማብቂያ ቀን፣ የምርት ደረጃ እና የባንድሎች ስርጭት ሁኔታ
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <Link
              href="/reports/orders"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-ethiopic transition-all ${
                activeOnly ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              በሂደት ላይ ያሉ (ንቁ)
            </Link>
            <Link
              href="/reports/orders?status=all"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-ethiopic transition-all ${
                !activeOnly ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ሁሉም ትዕዛዞች
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="erp-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">ጠቅላላ ትዕዛዞች</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Factory size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-2">
            {orders.length}
          </p>
        </div>

        <div className="erp-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">የዘገዩ ትዕዛዞች</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${overdueCount > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
              {overdueCount > 0 ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            </div>
          </div>
          <p className={`text-2xl font-bold tabular-nums mt-2 ${overdueCount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
            {overdueCount}
          </p>
        </div>

        <div className="erp-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">ቆረጣ የተጀመረላቸው</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-2">
            {inCuttingCount}
          </p>
        </div>

        <div className="erp-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">ጠቅላላ ባንድሎች</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-2">
            {totalBundles.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Main Table */}
      <div className="erp-card overflow-hidden">
        <table className="w-full text-left data-table">
          <thead>
            <tr>
              <th>የትዕዛዝ ቁጥር</th>
              <th>ስታይል</th>
              <th>ደንበኛ</th>
              <th className="text-right">መጠን (ፍሬ)</th>
              <th>የማብቂያ ቀን</th>
              <th>ያሉበት የምርት ደረጃዎች</th>
              <th className="text-center">{am.status}</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400 font-ethiopic">
                  ምንም ትዕዛዝ አልተገኘም
                </td>
              </tr>
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
                <tr key={order.id} className={isOverdue ? "bg-rose-50/30" : ""}>
                  <td>
                    <Link
                      href={`/production/orders/${order.id}`}
                      className="font-mono text-xs font-bold text-blue-600 hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="font-semibold text-slate-800 font-ethiopic">{order.style.nameAm}</td>
                  <td className="text-slate-600 font-ethiopic text-sm">{order.customer ?? "—"}</td>
                  <td className="tabular-nums font-semibold text-slate-900 text-right">
                    {order.quantity.toLocaleString()}
                  </td>
                  <td className={`font-ethiopic text-sm ${isOverdue ? "text-rose-600 font-bold" : "text-slate-600"}`}>
                    <div className="flex items-center gap-1.5">
                      <span>{order.dueDate ? formatAsEthDate(order.dueDate) : "—"}</span>
                      {isOverdue && <span className="badge-danger text-[10px]">የዘገየ</span>}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      {stageEntries.length === 0 ? (
                        <span className="text-xs text-slate-400 font-ethiopic">የቆረጣ ሥራ አልተጀመረም</span>
                      ) : (
                        stageEntries.map(([stage, count]) => (
                          <span
                            key={stage}
                            className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-ethiopic tabular-nums border border-slate-200"
                          >
                            {STAGE_AM[stage] ?? stage}: <strong className="text-slate-900">{count}</strong>
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={order.isActive ? "badge-verified font-ethiopic" : "badge-draft font-ethiopic"}>
                      {order.isActive ? "በሂደት ላይ" : "ተጠናቋል"}
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
