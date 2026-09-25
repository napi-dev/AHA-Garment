import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { upsertBomItem } from "../../actions";
import Decimal from "decimal.js";

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
  const canEdit = ["ADMIN","SUPER_MANAGER","CUTTING_MANAGER"].includes(session.user.role);
  const action  = upsertBomItem;

  const STAGES_AM: Record<string, string> = {
    RECEIVING:"ጥሬ እቃ መቀበያ", CUTTING:"ቆረጣ", SEWING:"ስፌት",
    TRIMMING:"ለቀማ", QUALITY_CONTROL:"ጥራት ቁጥጥር",
    STYLING_HITPRESS:"ሂትፕረስ", IRONING:"ካውያ", PACKING:"ማሸግ", DELIVERY:"ማድረስ",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <p className="text-sm text-gray-500 mb-1 font-ethiopic">
          <a href="/production/styles" className="hover:underline">ስታይሎች</a> /
        </p>
        <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{style.nameAm}</h1>
        <p className="text-gray-500 text-sm font-mono">{style.code}</p>
      </div>

      {/* Stage route */}
      <section>
        <h2 className="font-semibold text-gray-700 font-ethiopic mb-3">የደረጃ መስመር</h2>
        <div className="flex flex-wrap gap-2">
          {style.stageRoutes.map((sr, idx) => (
            <span key={sr.id} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-ethiopic">
              <span className="font-bold">{idx + 1}</span>
              {STAGES_AM[sr.stage] ?? sr.stage}
            </span>
          ))}
        </div>
      </section>

      {/* BOM */}
      <section>
        <h2 className="font-semibold text-gray-700 font-ethiopic mb-3">BOM — የጥሬ እቃ ዝርዝር</h2>

        {canEdit && (
          <form action={action} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-end mb-4">
            <input type="hidden" name="styleId" value={id} />
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs text-gray-500 mb-1 font-ethiopic">ጥሬ እቃ</label>
              <select name="materialId" required className="input-field font-ethiopic">
                <option value="">ምረጥ</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.nameAm} ({m.sku})</option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="block text-xs text-gray-500 mb-1 font-ethiopic">በፍሬ መጠን</label>
              <input name="qtyPerPiece" type="number" step="0.0001" min="0.0001" required
                className="input-field tabular-nums" placeholder="0.2500" />
            </div>
            <div className="w-20">
              <label className="block text-xs text-gray-500 mb-1">ክፍሎ</label>
              <input name="unit" defaultValue="kg" className="input-field" />
            </div>
            <button type="submit" className="px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-ethiopic hover:bg-blue-700">ጨምር</button>
          </form>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm data-table">
            <thead><tr><th>ጥሬ እቃ</th><th>SKU</th><th>በፍሬ</th><th>ክፍሎ</th></tr></thead>
            <tbody>
              {style.bomItems.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400 font-ethiopic">BOM አልተቀመጠም</td></tr>
              )}
              {style.bomItems.map((b) => (
                <tr key={b.id}>
                  <td className="font-ethiopic text-gray-800">{b.material.nameAm}</td>
                  <td className="font-mono text-xs text-gray-500">{b.material.sku}</td>
                  <td className="tabular-nums text-right">{new Decimal(b.qtyPerPiece.toString()).toFixed(4)}</td>
                  <td className="text-center text-gray-500">{b.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
