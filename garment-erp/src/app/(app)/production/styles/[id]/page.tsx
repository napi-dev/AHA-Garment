import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { upsertBomItem } from "../../actions";
import Link from "next/link";
import Decimal from "decimal.js";
import { Scissors, Layers, Plus, ArrowLeft, GitFork, ArrowRight, Package } from "lucide-react";
import { am } from "@/lib/i18n/am";

export default async function StyleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "bundles:view");

  const { id } = await params;
  const style = await db.garmentStyle.findUnique({
    where: { id },
    include: {
      bomItems: { include: { material: true } },
      stageRoutes: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!style) notFound();

  const materials = await db.material.findMany({ where: { isActive: true }, orderBy: { sku: "asc" } });
  const canEdit = ["ADMIN", "SUPER_MANAGER", "CUTTING_MANAGER"].includes(session.user.role);
  const action = upsertBomItem;

  const STAGES_AM: Record<string, string> = {
    RECEIVING: "ጥሬ ዕቃ መቀበያ",
    CUTTING: "ቆረጣ",
    SEWING: "ስፌት",
    TRIMMING: "ለቀማ",
    QUALITY_CONTROL: "ጥራት ቁጥጥር",
    STYLING_HITPRESS: "ሂትፕረስ",
    IRONING: "ካውያ",
    PACKING: "ማሸግ",
    DELIVERY: "ማድረስ",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/production/styles"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 font-ethiopic"
        >
          <ArrowLeft size={14} />
          <span>ወደ ስታይሎች ዝርዝር ተመለስ</span>
        </Link>
      </div>

      {/* Style Header */}
      <div className="erp-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
              <Scissors size={14} />
              <span>የምርት ስታይል ዝርዝር</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
              {style.nameAm}
            </h1>
            <p className="text-slate-500 font-mono text-xs mt-0.5">
              ኮድ፦ {style.code}
            </p>
          </div>
          <span className="badge-verified font-ethiopic">
            {style.isActive ? "ንቁ ስታይል" : "ተዘግቷል"}
          </span>
        </div>
      </div>

      {/* Stage Route */}
      <div className="erp-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <GitFork size={18} className="text-blue-600" />
          <h2 className="font-bold text-slate-800 font-ethiopic text-base">
            የምርት ደረጃዎች ቅደም ተከተል (Stage Route)
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {style.stageRoutes.map((sr, idx) => (
            <div key={sr.id} className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 bg-blue-50/80 border border-blue-200 text-blue-800 px-3 py-1.5 rounded-xl text-xs font-ethiopic shadow-sm">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
                  {idx + 1}
                </span>
                <span>{STAGES_AM[sr.stage] ?? sr.stage}</span>
              </span>
              {idx < style.stageRoutes.length - 1 && (
                <ArrowRight size={14} className="text-slate-300" />
              )}
            </div>
          ))}
          {style.stageRoutes.length === 0 && (
            <p className="text-xs text-slate-400 font-ethiopic py-2">ምንም የምርት ደረጃ አልተቀመጠም</p>
          )}
        </div>
      </div>

      {/* BOM Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-blue-600" />
            <h2 className="font-bold text-slate-800 font-ethiopic text-base">
              የጥሬ ዕቃ ዝርዝርና ፍጆታ (BOM)
            </h2>
          </div>
        </div>

        {canEdit && (
          <form action={action} className="erp-card p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <input type="hidden" name="styleId" value={id} />
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-ethiopic">
                ጥሬ ዕቃ ይምረጡ *
              </label>
              <select name="materialId" required className="input-field font-ethiopic text-xs py-2">
                <option value="">— ጥሬ ዕቃ ይምረጡ —</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nameAm} ({m.sku})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-ethiopic">
                ለአንድ ፍሬ መጠን *
              </label>
              <input
                name="qtyPerPiece"
                type="number"
                step="0.0001"
                min="0.0001"
                required
                className="input-field tabular-nums text-xs py-2"
                placeholder="0.2500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-ethiopic">
                መለኪያ (Unit)
              </label>
              <div className="flex gap-2">
                <input
                  name="unit"
                  defaultValue="kg"
                  className="input-field text-xs py-2 w-20"
                />
                <button
                  type="submit"
                  className="btn-primary text-xs py-2 px-3 whitespace-nowrap flex-1"
                >
                  <Plus size={14} />
                  <span>አክል</span>
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="erp-card overflow-hidden">
          <table className="w-full text-left data-table">
            <thead>
              <tr>
                <th>ጥሬ ዕቃ</th>
                <th>SKU መለያ</th>
                <th className="text-right">ለአንድ ፍሬ መጠን</th>
                <th className="text-center">መለኪያ</th>
              </tr>
            </thead>
            <tbody>
              {style.bomItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-400 font-ethiopic">
                    ምንም የጥሬ ዕቃ ፍጆታ (BOM) አልተመዘገበም
                  </td>
                </tr>
              )}
              {style.bomItems.map((b) => (
                <tr key={b.id}>
                  <td className="font-semibold text-slate-800 font-ethiopic">{b.material.nameAm}</td>
                  <td className="font-mono text-xs text-slate-500">{b.material.sku}</td>
                  <td className="tabular-nums font-semibold text-slate-900 text-right">
                    {new Decimal(b.qtyPerPiece.toString()).toFixed(4)}
                  </td>
                  <td className="text-center text-slate-500 font-mono text-xs">{b.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
