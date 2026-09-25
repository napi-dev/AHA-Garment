import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import Link from "next/link";

export default async function PackingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "finished_goods:view");

  // Bundles currently at PACKING stage — staging queue
  const stagingQueue = await db.bundle.findMany({
    where: { currentStage: "PACKING" },
    include: {
      cutJob: { include: { order: { include: { style: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Bundles at DELIVERY (already dispatched or ready)
  const readyForDispatch = await db.bundle.findMany({
    where: { currentStage: "DELIVERY" },
    include: {
      cutJob: { include: { order: { include: { style: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Recent deliveries
  const recentDeliveries = await db.delivery.findMany({
    include: { order: { include: { style: true } } },
    orderBy: { dispatchedAt: "desc" },
    take: 20,
  });

  const canEdit = ["ADMIN","SUPER_MANAGER","FINISHED_GOODS_MANAGER"].includes(session.user.role);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{am.nav.packing} / {am.nav.delivery}</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="ለማሸግ ዝግጁ" value={stagingQueue.length} color="text-teal-700" />
        <StatCard label="ለማድረስ ዝግጁ" value={readyForDispatch.length} color="text-blue-700" />
        <StatCard label="የታደሱ ትዕዛዞች" value={recentDeliveries.length} color="text-green-700" />
      </div>

      {/* Staging queue */}
      <section>
        <h2 className="font-semibold text-gray-700 font-ethiopic mb-3">ለማሸግ ዝግጁ ባንድሎች</h2>
        {stagingQueue.length === 0 ? (
          <p className="bg-gray-50 rounded-2xl p-6 text-center text-gray-400 font-ethiopic">ምንም ባንድል የለም</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {stagingQueue.map((b) => (
              <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-bold text-gray-800">{b.bundleCode}</p>
                  <p className="font-ethiopic text-gray-600 text-sm">{b.cutJob.order.style.nameAm}</p>
                  <p className="text-xs text-gray-400 tabular-nums mt-0.5">{b.quantity} ፍሬ · {b.cutJob.order.orderNumber}</p>
                </div>
                {canEdit && (
                  <Link href={`/packing/dispatch/${b.id}`}
                    className="flex-shrink-0 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-ethiopic hover:bg-teal-700 transition-colors">
                    አሽግ & ላክ
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
          <h2 className="font-semibold text-gray-700 font-ethiopic mb-3">ለማድረስ ዝግጁ</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                    <td className="font-ethiopic text-gray-700">{b.cutJob.order.style.nameAm}</td>
                    <td className="font-mono text-xs text-gray-500">{b.cutJob.order.orderNumber}</td>
                    <td className="tabular-nums text-center">{b.quantity}</td>
                    {canEdit && (
                      <td>
                        <Link href={`/packing/dispatch/${b.id}`}
                          className="text-xs text-blue-600 hover:underline font-ethiopic">ላክ</Link>
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
        <h2 className="font-semibold text-gray-700 font-ethiopic mb-3">የቅርብ ጊዜ ላኪዎች</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 font-ethiopic">{am.noData}</td></tr>
              )}
              {recentDeliveries.map((d) => (
                <tr key={d.id}>
                  <td className="font-ethiopic text-sm">{formatAsEthDate(d.dispatchedAt)}</td>
                  <td className="font-mono text-xs text-gray-700">{d.order.orderNumber}</td>
                  <td className="font-ethiopic text-gray-700">{d.order.style.nameAm}</td>
                  <td className="font-ethiopic text-gray-600">{d.customer}</td>
                  <td className="tabular-nums text-center">{d.quantity.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-500 font-ethiopic mb-1">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
