import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import Link from "next/link";
import { updateOrderStatus } from "../../actions";
import { Factory, ArrowRight, Scissors, CheckCircle, AlertTriangle, Clock, Layers, Package, User } from "lucide-react";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "/production");

  const { id } = await params;
  const order = await db.prodOrder.findUnique({
    where: { id },
    include: {
      lines: true,
      cutJobs: {
        orderBy: { createdAt: "desc" },
      },
      handovers: {
        include: {
          fromDept: true,
          toDept: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!order) notFound();

  const canEdit = session.user.role === "ADMIN" || session.user.role === "PRODUCTION_MANAGER";
  const now = new Date();
  const totalTargetQty = order.lines.reduce((s, l) => s + l.qty, 0);
  const totalPiecesCut = order.cutJobs.reduce((s, c) => s + c.piecesCut, 0);

  // Countdown calculation
  const hoursLeft = (order.deadlineAt.getTime() - now.getTime()) / (1000 * 60 * 60);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/production"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors font-ethiopic"
        >
          <ArrowRight size={14} className="rotate-180" />
          <span>ወደ ምርት ትዕዛዞች ዝርዝር ተመለስ</span>
        </Link>

        {canEdit && order.status === "ACTIVE" && (
          <div className="flex items-center gap-2">
            <form action={updateOrderStatus.bind(null, id, "COMPLETED")}>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors font-ethiopic flex items-center gap-1.5"
              >
                <CheckCircle size={14} />
                <span>ትዕዛዝ አጠናቅ</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Header Card */}
      <div className="erp-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-2xl font-black text-blue-700">
                {order.orderNo}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${
                  order.status === "ACTIVE"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : order.status === "COMPLETED"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {order.status === "ACTIVE" ? "በሂደት ላይ" : order.status === "COMPLETED" ? "የተጠናቀቀ" : "የተሰረዘ"}
              </span>

              {order.status === "ACTIVE" && (
                hoursLeft <= 0 ? (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                    🔴 ጊዜው አልፏል
                  </span>
                ) : hoursLeft <= 24 ? (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                    🔴 24 ሰዓት ሲቀር
                  </span>
                ) : hoursLeft <= 48 ? (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    🟡 48 ሰዓት ሲቀር
                  </span>
                ) : hoursLeft <= 72 ? (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    🟢 72 ሰዓት ሲቀር
                  </span>
                ) : null
              )}
            </div>

            <p className="text-slate-500 text-xs mt-1.5 font-ethiopic">
              የተመዘገበበት ቀን፦ {formatAsEthDate(order.createdAt)} · የማጠናቀቂያ ቀን፦ {formatAsEthDate(order.deadlineAt)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-400 font-ethiopic">የተጠየቀው ጠቅላላ ብዛት</p>
            <p className="text-2xl font-bold font-mono text-slate-900">
              {totalTargetQty.toLocaleString()} <span className="text-xs font-normal font-ethiopic">ፍሬ</span>
            </p>
          </div>
        </div>
      </div>

      {/* Order Lines */}
      <div className="erp-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 font-ethiopic flex items-center gap-2">
            <Package size={16} className="text-blue-600" />
            የልብስ ዓይነቶችና መጠኖች (Lines)
          </h2>
          <span className="text-xs text-slate-400 font-ethiopic">
            {order.lines.length} መስመሮች
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-ethiopic">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-medium text-right bg-slate-50/50">
                <th className="py-2.5 px-4 text-left">የልብስ ዓይነት</th>
                <th className="py-2.5 px-4 text-left">ቀለም</th>
                <th className="py-2.5 px-4 text-center">ሳይዝ (Size)</th>
                <th className="py-2.5 px-4">ብዛት</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.lines.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-semibold text-slate-800 text-left">
                    {l.typeId}
                  </td>
                  <td className="py-2.5 px-4 text-slate-700 text-left">
                    {l.color}
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-900">
                    {l.size}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-700">
                    {l.qty.toLocaleString()} ፍሬ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cutting Jobs */}
      <div className="erp-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 font-ethiopic flex items-center gap-2">
            <Scissors size={16} className="text-orange-600" />
            የቆረጣ ምዝገባዎች
          </h2>
          <span className="text-xs text-slate-500 font-ethiopic">
            የተቆረጠ ድምር፦ <strong className="font-mono text-slate-900">{totalPiecesCut}</strong> ፍሬ
          </span>
        </div>

        {order.cutJobs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-ethiopic">
            ምንም የቆረጣ ምዝገባ አልተደረገም
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-ethiopic">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-medium text-right bg-slate-50/50">
                  <th className="py-2.5 px-4 text-left">ቀን</th>
                  <th className="py-2.5 px-4">የተሰጠ ጨርቅ</th>
                  <th className="py-2.5 px-4">የተቆረጠ ፍሬ</th>
                  <th className="py-2.5 px-4">ፍጆታ (ኪ.ግ/ፍሬ)</th>
                  <th className="py-2.5 px-4 text-center">ሁኔታ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.cutJobs.map((c) => {
                  const isHigh = Number(c.consumption) > Number(c.limitUsed);
                  return (
                    <tr key={c.id}>
                      <td className="py-2.5 px-4 font-mono text-slate-600 text-left">
                        {formatAsEthDate(c.date)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        {Number(c.kgReceived).toFixed(2)} ኪ.ግ
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {c.piecesCut} ፍሬ
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold">
                        <span className={isHigh ? "text-rose-600" : "text-emerald-700"}>
                          {Number(c.consumption).toFixed(4)}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {isHigh ? (
                          <span className="badge-void text-[10px]">ከወሰን በላይ</span>
                        ) : (
                          <span className="badge-confirmed text-[10px]">ትክክል</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Handover flow */}
      <div className="erp-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 font-ethiopic flex items-center gap-2">
            <Layers size={16} className="text-purple-600" />
            የርክክብ እንቅስቃሴዎች (Handovers)
          </h2>
          <span className="text-xs text-slate-400 font-ethiopic">
            {order.handovers.length} እንቅስቃሴዎች
          </span>
        </div>

        {order.handovers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-ethiopic">
            ምንም የርክክብ ምዝገባ አልተገኘም
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-ethiopic">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-medium text-right bg-slate-50/50">
                  <th className="py-2.5 px-4 text-left">ከክፍል</th>
                  <th className="py-2.5 px-4 text-left">ወደ ክፍል</th>
                  <th className="py-2.5 px-4">የተላከ</th>
                  <th className="py-2.5 px-4">የተቀበለ</th>
                  <th className="py-2.5 px-4 text-center">ፍልልያ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.handovers.map((h) => {
                  const sent = Number(h.sentQty);
                  const rec = h.receivedQty ? Number(h.receivedQty) : null;
                  const diff = rec !== null ? rec - sent : null;

                  return (
                    <tr key={h.id}>
                      <td className="py-2.5 px-4 font-semibold text-slate-800 text-left">
                        {h.fromDept?.nameAm ?? "—"}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 text-left">
                        {h.toDept?.nameAm ?? "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {sent} {h.unit}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {rec !== null ? `${rec} ${h.unit}` : "በጥበቃ ላይ..."}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {diff === null ? (
                          <span className="badge-draft text-[10px]">በጥበቃ ላይ</span>
                        ) : diff === 0 ? (
                          <span className="badge-confirmed text-[10px]">0 ✓</span>
                        ) : (
                          <span className="badge-void text-[10px] font-mono">
                            ⚠ {diff > 0 ? `+${diff}` : diff}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
