import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import Link from "next/link";
import { closeOrder } from "../../actions";

const STAGES_AM: Record<string, string> = {
  RECEIVING:"ጥሬ እቃ", CUTTING:"ቆረጣ", SEWING:"ስፌት",
  TRIMMING:"ለቀማ", QUALITY_CONTROL:"ጥራት", STYLING_HITPRESS:"ሂትፕረስ",
  IRONING:"ካውያ", PACKING:"ማሸግ", DELIVERY:"ማድረስ",
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "bundles:view");

  const { id } = await params;
  const order = await db.prodOrder.findUnique({
    where: { id },
    include: {
      style: true,
      cutJobs: {
        include: {
          bundles: {
            include: { stageLogs: { orderBy: { enteredAt: "desc" }, take: 1 } },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!order) notFound();

  const closeAction = closeOrder.bind(null, id);
  const canEdit = ["ADMIN","SUPER_MANAGER","PRODUCTION_MANAGER"].includes(session.user.role);

  // Stage distribution
  const stageCounts: Record<string, number> = {};
  for (const cj of order.cutJobs) {
    for (const b of cj.bundles) {
      stageCounts[b.currentStage] = (stageCounts[b.currentStage] ?? 0) + 1;
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-gray-500 mb-1 font-ethiopic">
            <Link href="/production" className="hover:underline">ምርት</Link> /
          </p>
          <h1 className="text-2xl font-bold text-gray-900 font-mono">{order.orderNumber}</h1>
          <p className="font-ethiopic text-gray-600 mt-0.5">{order.style.nameAm} · {order.quantity.toLocaleString()} ፍሬ</p>
          {order.customer && <p className="text-sm text-gray-500">{order.customer}</p>}
          {order.dueDate && (
            <p className={`text-sm font-ethiopic mt-1 ${order.dueDate < new Date() && order.isActive ? "text-red-600 font-semibold" : "text-gray-500"}`}>
              ማብቂያ: {formatAsEthDate(order.dueDate)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/cutting/new?orderId=${order.id}`}
            className="px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-ethiopic hover:bg-orange-600 transition-colors">
            ቆረጣ ጀምር
          </Link>
          {canEdit && order.isActive && (
            <form action={closeAction}>
              <button className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-ethiopic hover:bg-gray-200 transition-colors">
                ትዕዛዝ ዝጋ
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Stage pipeline */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-700 font-ethiopic mb-4">ባንድሎች በደረጃ</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(STAGES_AM).map(([stage, label]) => {
            const count = stageCounts[stage] ?? 0;
            return (
              <div key={stage} className={`flex-1 min-w-[80px] rounded-xl p-3 text-center ${count > 0 ? "bg-blue-50 border border-blue-100" : "bg-gray-50 border border-gray-100"}`}>
                <p className={`text-2xl font-bold tabular-nums ${count > 0 ? "text-blue-700" : "text-gray-300"}`}>{count}</p>
                <p className={`text-xs mt-1 font-ethiopic ${count > 0 ? "text-blue-600" : "text-gray-400"}`}>{label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cut jobs */}
      {order.cutJobs.map((cj) => (
        <div key={cj.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-700 font-ethiopic">ቆርጦ #{cj.id.slice(-6)}</p>
              <p className="text-xs text-gray-500 font-ethiopic">
                {formatAsEthDate(cj.date)} · {cj.piecesCut} ፍሬ · ብክነት: <span className={Number(cj.wastagePct) > 5 ? "text-red-600 font-semibold" : "text-gray-600"}>{Number(cj.wastagePct).toFixed(1)}%</span>
              </p>
            </div>
            <span className="text-xs text-gray-500">{cj.bundles.length} ባንድሎች</span>
          </div>
          <table className="w-full text-sm data-table">
            <thead>
              <tr><th>ባንድል</th><th>መጠን</th><th>አሁን ያለበት</th></tr>
            </thead>
            <tbody>
              {cj.bundles.map((b) => (
                <tr key={b.id}>
                  <td className="font-mono text-xs">{b.bundleCode}</td>
                  <td className="text-center tabular-nums">{b.quantity}</td>
                  <td className="font-ethiopic text-gray-700 text-xs">{STAGES_AM[b.currentStage] ?? b.currentStage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
