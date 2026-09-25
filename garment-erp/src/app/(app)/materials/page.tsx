import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import Link from "next/link";
import { Package, AlertTriangle, Plus } from "lucide-react";

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; low?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "stock:view");

  const params = await searchParams;
  const showLowOnly = params.low === "1";

  const materials = await db.material.findMany({
    where: {
      isActive: true,
      ...(params.q ? { OR: [{ nameAm: { contains: params.q } }, { sku: { contains: params.q } }] } : {}),
    },
    orderBy: { sku: "asc" },
  });

  // Compute on-hand for each material
  const withStock = await Promise.all(
    materials.map(async (m) => {
      const agg = await db.stockMovement.aggregate({
        where: { materialId: m.id },
        _sum: {
          // We compute manually below — aggregate doesn't support conditional sums
        },
      });
      const movements = await db.stockMovement.findMany({
        where: { materialId: m.id },
        select: { type: true, quantity: true },
      });
      let onHand = 0;
      for (const mv of movements) {
        const qty = Number(mv.quantity);
        if (mv.type === "RECEIVE" || mv.type === "RETURN") onHand += qty;
        else if (mv.type === "ISSUE" || mv.type === "ADJUST") onHand -= qty;
      }
      const isLow = onHand <= Number(m.minimumLevel);
      return { ...m, onHand, isLow };
    })
  );

  const filtered = showLowOnly ? withStock.filter((m) => m.isLow) : withStock;
  const lowCount = withStock.filter((m) => m.isLow).length;
  const canEdit = ["ADMIN", "SUPER_MANAGER", "STORE_KEEPER"].includes(session.user.role);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{am.materials.title}</h1>
          {lowCount > 0 && (
            <p className="text-sm text-orange-600 font-ethiopic mt-0.5 flex items-center gap-1">
              <AlertTriangle size={14} /> {lowCount} ዝቅተኛ ክምችት ላይ
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Link href="/materials/new"
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors font-ethiopic">
              <Plus size={16} /> {am.materials.title} ጨምር
            </Link>
          )}
          <Link href="/materials/receive"
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors font-ethiopic">
            <Package size={16} /> {am.materials.receive}
          </Link>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        <input name="q" defaultValue={params.q ?? ""}
          placeholder="SKU ወይም ስም ፈልግ"
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-ethiopic w-48" />
        <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm cursor-pointer hover:bg-gray-50">
          <input type="checkbox" name="low" value="1" defaultChecked={showLowOnly}
            className="accent-orange-500" />
          <span className="font-ethiopic text-orange-700">{am.materials.lowStock} ብቻ</span>
        </label>
        <button type="submit"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-ethiopic hover:bg-gray-200">
          {am.filter}
        </button>
      </form>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm data-table">
          <thead>
            <tr>
              <th className="w-28">{am.materials.sku}</th>
              <th>{am.materials.name}</th>
              <th className="w-16">{am.materials.unit}</th>
              <th className="w-28">{am.materials.currentStock}</th>
              <th className="w-28">{am.materials.minimumLevel}</th>
              <th className="w-24">{am.status}</th>
              {canEdit && <th className="w-24">{am.actions}</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400 font-ethiopic">{am.noData}</td></tr>
            )}
            {filtered.map((m) => (
              <tr key={m.id} className={m.isLow ? "bg-orange-50/60" : ""}>
                <td className="font-mono text-xs font-medium text-gray-700">{m.sku}</td>
                <td className="font-ethiopic text-gray-800 font-medium">{m.nameAm}</td>
                <td className="text-center text-gray-500">{m.unit}</td>
                <td className={`tabular-nums font-semibold text-right ${m.isLow ? "text-orange-700" : "text-gray-800"}`}>
                  {m.onHand.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                  {m.isLow && <span className="ml-1 text-orange-500">⚠️</span>}
                </td>
                <td className="tabular-nums text-right text-gray-500">
                  {Number(m.minimumLevel).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                </td>
                <td className="text-center">
                  {m.isLow
                    ? <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-ethiopic">{am.materials.lowStock}</span>
                    : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-ethiopic">ጥሩ</span>}
                </td>
                {canEdit && (
                  <td>
                    <div className="flex gap-2 justify-center">
                      <Link href={`/materials/${m.id}/movements`}
                        className="text-xs text-blue-600 hover:underline font-ethiopic">ታሪክ</Link>
                      <Link href={`/materials/${m.id}/issue`}
                        className="text-xs text-purple-600 hover:underline font-ethiopic">{am.materials.issue}</Link>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-2 text-xs text-gray-400 border-t border-gray-100 font-ethiopic">
          {filtered.length} ጥሬ እቃዎች
        </div>
      </div>
    </div>
  );
}
