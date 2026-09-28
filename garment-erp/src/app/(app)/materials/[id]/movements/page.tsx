import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import Link from "next/link";
import { History, ArrowRight, Package, ArrowDownLeft, ArrowUpRight, RotateCcw, Sliders, AlertTriangle } from "lucide-react";

export default async function MovementsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "stock:view");

  const { id } = await params;
  const material = await db.material.findUnique({ where: { id } });
  if (!material) notFound();

  const movements = await db.stockMovement.findMany({
    where: { materialId: id },
    include: { lot: true },
    orderBy: { date: "desc" },
  });

  let running = 0;
  for (const mv of [...movements].reverse()) {
    const q = Number(mv.quantity);
    if (mv.type === "RECEIVE" || mv.type === "RETURN") running += q;
    else running -= q;
  }

  const isLow = running <= Number(material.minimumLevel);

  const typeConfig: Record<string, { label: string; icon: React.ReactNode; badgeClass: string; sign: string }> = {
    RECEIVE: {
      label: am.materials.receive,
      icon: <ArrowDownLeft size={13} className="text-emerald-600" />,
      badgeClass: "badge-verified",
      sign: "+",
    },
    ISSUE: {
      label: am.materials.issue,
      icon: <ArrowUpRight size={13} className="text-rose-600" />,
      badgeClass: "badge-danger",
      sign: "−",
    },
    RETURN: {
      label: am.materials.return,
      icon: <RotateCcw size={13} className="text-blue-600" />,
      badgeClass: "badge-submitted",
      sign: "+",
    },
    ADJUST: {
      label: am.materials.adjust,
      icon: <Sliders size={13} className="text-purple-600" />,
      badgeClass: "badge-draft",
      sign: "±",
    },
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Navigation Link */}
      <div>
        <Link
          href="/materials"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors font-ethiopic"
        >
          <ArrowRight size={14} className="rotate-180" />
          <span>ወደ ጥሬ ዕቃዎች ዝርዝር ተመለስ</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="erp-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
          <History size={14} />
          <span>የጥሬ ዕቃ እንቅስቃሴ ታሪክ</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          {material.nameAm}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5 font-ethiopic flex items-center gap-2">
          <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
            {material.sku}
          </span>
          <span>·</span>
          <span>መለኪያ፦ {material.unit}</span>
        </p>
      </div>

      {/* Current Stock Banner */}
      <div className={`erp-card p-6 border ${isLow ? "bg-amber-50/70 border-amber-300" : "bg-emerald-50/70 border-emerald-300"}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-600 font-ethiopic mb-1">
              {am.materials.currentStock}
            </p>
            <p className={`text-4xl font-bold tabular-nums ${isLow ? "text-amber-800" : "text-emerald-800"}`}>
              {running.toLocaleString("en-ET", { minimumFractionDigits: 3 })} <span className="text-lg font-normal">{material.unit}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1 font-ethiopic">
              ዝቅተኛ ወሰን፦ {Number(material.minimumLevel).toLocaleString("en-ET", { minimumFractionDigits: 2 })} {material.unit}
            </p>
          </div>
          {isLow ? (
            <div className="flex items-center gap-1.5 bg-amber-100 text-amber-800 px-3 py-1.5 rounded-xl font-ethiopic text-xs font-bold">
              <AlertTriangle size={15} />
              <span>ዝቅተኛ ክምችት</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-xl font-ethiopic text-xs font-bold">
              <span>በቂ ክምችት</span>
            </div>
          )}
        </div>
      </div>

      {/* Movements Table */}
      <div className="erp-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-sm font-ethiopic">
            የገቢና ወጪ ምዝገባዎች ታሪክ ({movements.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead>
              <tr>
                <th className="text-right">ቀን</th>
                <th className="text-center">የእንቅስቃሴ አይነት</th>
                <th className="text-right">መጠን</th>
                <th className="text-center">ሎት (Lot)</th>
                <th className="text-right">ማስታወሻ / ማጣቀሻ</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 font-ethiopic">
                    ምንም የእንቅስቃሴ መረጃ አልተመዘገበም
                  </td>
                </tr>
              ) : (
                movements.map((mv) => {
                  const cfg = typeConfig[mv.type] ?? typeConfig.ADJUST;
                  return (
                    <tr key={mv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="font-ethiopic text-slate-700 text-right py-3.5">
                        {formatAsEthDate(mv.date)}
                      </td>
                      <td className="text-center py-3.5">
                        <span className={cfg.badgeClass}>
                          {cfg.icon}
                          <span>{cfg.label}</span>
                        </span>
                      </td>
                      <td className="tabular-nums font-bold text-right py-3.5 text-slate-800">
                        {cfg.sign} {Number(mv.quantity).toLocaleString("en-ET", { minimumFractionDigits: 3 })} {material.unit}
                      </td>
                      <td className="font-mono text-xs text-center py-3.5 text-slate-500">
                        {mv.lot?.lotNumber ?? mv.reference ?? "—"}
                      </td>
                      <td className="font-ethiopic text-slate-600 text-right py-3.5 text-xs">
                        {mv.notes ?? "—"}
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
