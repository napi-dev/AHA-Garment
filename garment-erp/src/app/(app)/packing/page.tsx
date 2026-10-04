import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import Link from "next/link";
import { Package, Truck, Clock, ArrowRight } from "lucide-react";

export default async function PackingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "finished_goods:view");

  const stagingQueue = await db.bundle.findMany({
    where: { currentStage: "PACKING" },
    include: {
      cutJob: { include: { order: { include: { style: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const readyForDispatch = await db.bundle.findMany({
    where: { currentStage: "DELIVERY" },
    include: {
      cutJob: { include: { order: { include: { style: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const recentDeliveries = await db.delivery.findMany({
    include: { order: { include: { style: true } } },
    orderBy: { dispatchedAt: "desc" },
    take: 20,
  });

  const canEdit = ["ADMIN","PRODUCTION_MANAGER","FINISHED_GOODS_MANAGER"].includes(session.user.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="erp-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 uppercase tracking-wider font-ethiopic">
            <Package size={14} />
            <span>ማሸጊያ ክፍል</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
            {am.nav.packing} / {am.nav.delivery}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-ethiopic">
            ዝግጁ ምርቶችን ማሸግ፣ ማጣሪያ እና ለደምበኛ ማድረስ
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="erp-card p-5">
          <p className="text-xs text-slate-500 font-ethiopic mb-1.5 flex items-center gap-1.5">
            <Package size={12} /> ለማሸግ ዝግጁ
          </p>
          <p className="text-3xl font-bold tabular-nums text-teal-700">{stagingQueue.length}</p>
        </div>
        <div className="erp-card p-5">
          <p className="text-xs text-slate-500 font-ethiopic mb-1.5 flex items-center gap-1.5">
            <Truck size={12} /> ለማድረስ ዝግጁ
          </p>
          <p className="text-3xl font-bold tabular-nums text-blue-700">{readyForDispatch.length}</p>
        </div>
        <div className="erp-card p-5">
          <p className="text-xs text-slate-500 font-ethiopic mb-1.5 flex items-center gap-1.5">
            <Clock size={12} /> ያለፉ ትዕዛዞች
          </p>
          <p className="text-3xl font-bold tabular-nums text-green-700">{recentDeliveries.length}</p>
        </div>
      </div>

      {/* Staging queue */}
      <section>
        <h2 className="font-semibold text-slate-700 font-ethiopic mb-3 flex items-center gap-2">
          <Package size={16} className="text-teal-600" /> ለማሸግ ዝግጁ ባንድሎች
        </h2>
        {stagingQueue.length === 0 ? (
          <div className="erp-card p-8 text-center">
            <Package size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 font-ethiopic">ምንም ባንድል ለማሸጊ የለም</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {stagingQueue.map((b) => (
              <div key={b.id} className="erp-card p-5 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-bold text-slate-800">{b.bundleCode}</p>
                  <p className="font-ethiopic text-slate-600 text-sm mt-0.5">{b.cutJob.order.style.nameAm}</p>
                  <p className="text-xs text-slate-400 tabular-nums mt-0.5">
                    {b.quantity} ፍሬ · {b.cutJob.order.orderNumber}
                  </p>
                </div>
                {canEdit && (
                  <Link href={`/packing/dispatch/${b.id}`}
                    className="flex items-center gap-2 flex-shrink-0 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-ethiopic hover:bg-teal-700 transition-colors font-semibold">
                    አሽግ & ላክ <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Ready for dispatch */}
      {readyForDispatch.length > 0 && (
        <section>
          <h2 className="font-semibold text-slate-700 font-ethiopic mb-3 flex items-center gap-2">
            <Truck size={16} className="text-blue-600" /> ለማድረስ ዝግጁ
          </h2>
          <div className="erp-card overflow-hidden">
            <table className="w-full text-sm data-table">
              <thead>
                <tr>
                  <th>ባንድል</th>
                  <th>ስታይል</th>
                  <th>ትዕዛዝ</th>
                  <th>መጠን</th>
                  {canEdit && <th>{am.actions}</th>}
                </tr>
              </thead>
              <tbody>
                {readyForDispatch.map((b) => (
                  <tr key={b.id}>
                    <td className="font-mono text-xs font-medium">{b.bundleCode}</td>
                    <td className="font-ethiopic text-slate-700">{b.cutJob.order.style.nameAm}</td>
                    <td className="font-mono text-xs text-slate-500">{b.cutJob.order.orderNumber}</td>
                    <td className="tabular-nums text-center font-semibold">{b.quantity}</td>
                    {canEdit && (
                      <td>
                        <Link href={`/packing/dispatch/${b.id}`}
                          className="text-xs text-blue-600 hover:text-blue-800 font-ethiopic font-semibold flex items-center gap-1">
                          <Truck size={11} /> ላክ
                        </Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent deliveries */}
      <section>
        <h2 className="font-semibold text-slate-700 font-ethiopic mb-3 flex items-center gap-2">
          <Clock size={16} className="text-slate-500" /> የቅርብ ጊዜ ላኪዎች
        </h2>
        <div className="erp-card overflow-hidden">
          <table className="w-full text-sm data-table">
            <thead>
              <tr>
                <th>ቀን</th>
                <th>ትዕዛዝ</th>
                <th>ስታይል</th>
                <th>ደምበኛ</th>
                <th>ፍሬዎች</th>
              </tr>
            </thead>
            <tbody>
              {recentDeliveries.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400 font-ethiopic">{am.noData}</td></tr>
              )}
              {recentDeliveries.map((d) => (
                <tr key={d.id}>
                  <td className="font-ethiopic text-sm">{formatAsEthDate(d.dispatchedAt)}</td>
                  <td className="font-mono text-xs text-slate-700">{d.order.orderNumber}</td>
                  <td className="font-ethiopic text-slate-700">{d.order.style.nameAm}</td>
                  <td className="font-ethiopic text-slate-600">{d.customer}</td>
                  <td className="tabular-nums text-center font-semibold">{d.quantity.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
