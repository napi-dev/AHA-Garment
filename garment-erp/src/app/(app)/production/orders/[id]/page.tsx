import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import Link from "next/link";
import { closeOrder } from "../../actions";
import { Factory, ArrowRight, Scissors, CheckCircle, AlertTriangle, Layers, Calendar } from "lucide-react";

const STAGES_AM: Record<string, string> = {
  RECEIVING: "ጥሬ ዕቃ",
  CUTTING: "ቆረጣ",
  SEWING: "ስፌት",
  TRIMMING: "ለቀማ",
  QUALITY_CONTROL: "ጥራት (QC)",
  STYLING_HITPRESS: "ሂትፕረስ",
  IRONING: "ካውያ",
  PACKING: "ማሸግ",
  DELIVERY: "መላኪያ",
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
  const canEdit = ["ADMIN", "SUPER_MANAGER", "PRODUCTION_MANAGER"].includes(session.user.role);

  // Stage distribution
  const stageCounts: Record<string, number> = {};
  for (const cj of order.cutJobs) {
    for (const b of cj.bundles) {
      stageCounts[b.currentStage] = (stageCounts[b.currentStage] ?? 0) + 1;
    }
  }

  const isOverdue = order.dueDate && order.dueDate < new Date() && order.isActive;
  const totalBundles = order.cutJobs.reduce((s, cj) => s + cj.bundles.length, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation Link */}
      <div>
        <Link
          href="/production"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors font-ethiopic"
        >
          <ArrowRight size={14} className="rotate-180" />
          <span>ወደ ምርት ትዕዛዞች ተመለስ</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="erp-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
            <Factory size={14} />
            <span>የትዕዛዝ ዝርዝር መረጃ</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-mono mt-1">
            {order.orderNumber}
          </h1>
          <p className="text-slate-600 font-ethiopic text-sm mt-0.5 flex items-center gap-2">
            <span className="font-semibold text-slate-800">{order.style.nameAm}</span>
            <span>·</span>
            <span className="tabular-nums font-bold text-slate-700">{order.quantity.toLocaleString()} ፍሬ</span>
            {order.customer && (
              <>
                <span>·</span>
                <span className="text-slate-500">{order.customer}</span>
              </>
            )}
          </p>
          {order.dueDate && (
            <p className={`text-xs font-ethiopic mt-1 flex items-center gap-1.5 ${isOverdue ? "text-rose-600 font-bold" : "text-slate-500"}`}>
              <Calendar size={13} />
              <span>የማጠናቀቂያ ቀን፦ {formatAsEthDate(order.dueDate)}</span>
              {isOverdue && <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[11px]">⚠️ ያለፈበት</span>}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href={`/cutting/new?orderId=${order.id}`}
            className="btn-primary flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 font-ethiopic"
          >
            <Scissors size={16} />
            <span>ቆረጣ ጀምር</span>
          </Link>

          {canEdit && order.isActive && (
            <form action={closeAction}>
              <button
                type="submit"
                className="btn-secondary text-slate-700 font-ethiopic text-xs"
              >
                ትዕዛዝ ዝጋ
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Stage Progression Pipeline Visual Card */}
      <div className="erp-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-blue-600" />
            <h2 className="font-bold text-slate-800 text-sm font-ethiopic">
              የባንድሎች የምርት ሂደት ደረጃ (Production Pipeline)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono font-semibold">
            ጠቅላላ፦ {totalBundles} ባንድል
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
          {Object.entries(STAGES_AM).map(([stage, label]) => {
            const count = stageCounts[stage] ?? 0;
            const hasBundles = count > 0;
            return (
              <div
                key={stage}
                className={`rounded-xl p-3 text-center border transition-all ${hasBundles ? "bg-blue-50/80 border-blue-200 shadow-sm" : "bg-slate-50/50 border-slate-100"}`}
              >
                <p className={`text-xl font-bold tabular-nums ${hasBundles ? "text-blue-700" : "text-slate-300"}`}>
                  {count}
                </p>
                <p className={`text-[11px] mt-1 font-ethiopic truncate ${hasBundles ? "text-blue-800 font-semibold" : "text-slate-400"}`}>
                  {label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cut Jobs Sections */}
      <div className="space-y-4">
        <h2 className="font-bold text-slate-800 text-base font-ethiopic">
          የተከናወኑ ቆረጣዎችና ባንድሎች ({order.cutJobs.length})
        </h2>

        {order.cutJobs.length === 0 ? (
          <div className="erp-card p-8 text-center text-slate-400 font-ethiopic">
            <Scissors size={32} className="mx-auto mb-2 text-slate-300" />
            <p>ለዚህ ትዕዛዝ እስካሁን ምንም የቆረጣ ስራ አልተመዘገበም</p>
          </div>
        ) : (
          order.cutJobs.map((cj) => (
            <div key={cj.id} className="erp-card overflow-hidden">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200/70 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-bold text-slate-800 font-ethiopic text-sm">
                    የቆረጣ ምዝገባ #{cj.id.slice(-6).toUpperCase()}
                  </p>
                  <p className="text-xs text-slate-500 font-ethiopic mt-0.5">
                    {formatAsEthDate(cj.date)} · የተቆረጠ ፍሬ፦ <span className="font-semibold text-slate-700">{cj.piecesCut.toLocaleString()}</span> · የብክነት ምጣኔ፦{" "}
                    <span className={Number(cj.wastagePct) > 5 ? "text-rose-600 font-bold" : "text-emerald-700 font-semibold"}>
                      {Number(cj.wastagePct).toFixed(1)}%
                    </span>
                  </p>
                </div>
                <span className="bg-slate-200/80 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold">
                  {cj.bundles.length} ባንድሎች
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm data-table">
                  <thead>
                    <tr>
                      <th className="text-center w-36">የባንድል መለያ (Code)</th>
                      <th className="text-center w-28">የፍሬ ብዛት</th>
                      <th className="text-right">አሁን ያለበት የምርት ደረጃ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cj.bundles.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="font-mono text-xs font-semibold text-slate-800 text-center py-3">
                          <span className="bg-slate-100 px-2.5 py-1 rounded-lg">
                            {b.bundleCode}
                          </span>
                        </td>
                        <td className="text-center tabular-nums font-bold text-slate-800 py-3">
                          {b.quantity}
                        </td>
                        <td className="font-ethiopic text-slate-700 text-right py-3 text-xs">
                          <span className="badge-submitted">
                            {STAGES_AM[b.currentStage] ?? b.currentStage}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
