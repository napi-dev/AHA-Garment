import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import Link from "next/link";
import { Package, AlertTriangle, Plus, ArrowDownLeft, ArrowUpRight, Search, Filter, History, CheckCircle2 } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 20;

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; low?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "stock:view");

  const params = await searchParams;
  const showLowOnly = params.low === "1";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const baseWhere = {
    isActive: true,
    ...(params.q ? { OR: [{ nameAm: { contains: params.q } }, { sku: { contains: params.q } }] } : {}),
  };

  // Fetch materials + their stock movements in one pass to avoid N+1
  const [allMaterials, totalCount] = await Promise.all([
    db.material.findMany({
      where: baseWhere,
      orderBy: { sku: "asc" },
      skip,
      take: PAGE_SIZE,
      include: {
        stockMovements: { select: { type: true, quantity: true } },
      },
    }),
    db.material.count({ where: baseWhere }),
  ]);

  const withStock = allMaterials.map((m) => {
    let onHand = 0;
    for (const mv of m.stockMovements) {
      const qty = Number(mv.quantity);
      if (mv.type === "RECEIVE" || mv.type === "RETURN") onHand += qty;
      else if (mv.type === "ISSUE" || mv.type === "ADJUST") onHand -= qty;
    }
    const isLow = onHand <= Number(m.minimumLevel);
    return { ...m, onHand, isLow };
  });

  const filtered = showLowOnly ? withStock.filter((m) => m.isLow) : withStock;
  const lowCount = withStock.filter((m) => m.isLow).length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const canEdit = ["ADMIN", "SUPER_MANAGER", "STORE_KEEPER"].includes(session.user.role);

  function buildHref(p: number) {
    const sp = new URLSearchParams();
    if (params.q)   sp.set("q",   params.q);
    if (showLowOnly) sp.set("low", "1");
    sp.set("page", String(p));
    return `/materials?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="erp-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
            <Package size={14} />
            <span>የጥሬ ዕቃና ግብአቶች መጋዘን</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
            {am.materials.title}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-ethiopic">
            የጨርቆች፣ ክሮች እና መለዋወጫዎች ወቅታዊ የክምችት መጠን እና የእንቅስቃሴ ክትትል
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {canEdit && (
            <Link
              href="/materials/new"
              className="btn-secondary flex items-center gap-2 font-ethiopic"
            >
              <Plus size={16} />
              <span>{am.materials.newMaterial}</span>
            </Link>
          )}

          <Link
            href="/materials/receive"
            className="btn-primary flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 font-ethiopic"
          >
            <ArrowDownLeft size={16} />
            <span>{am.materials.receive}</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">የተመዘገቡ ዕቃዎች (SKU)</p>
            <Package size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{totalCount}</p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">ዝቅተኛ ክምችት ላይ ያሉ</p>
            <AlertTriangle size={16} className={lowCount > 0 ? "text-amber-500" : "text-slate-400"} />
          </div>
          <p className={`text-2xl font-bold tabular-nums ${lowCount > 0 ? "text-amber-600" : "text-slate-800"}`}>
            {lowCount}
          </p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">በቂ ክምችት ያላቸው</p>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums">
            {materials.length - lowCount}
          </p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">የተጣሩ ዕቃዎች</p>
            <Filter size={16} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-indigo-700 tabular-nums">{totalCount}</p>
        </div>
      </div>

      {lowCount > 0 && (
        <div className="alert-warning flex items-center gap-2 font-ethiopic text-xs">
          <AlertTriangle size={16} className="text-amber-700 flex-shrink-0" />
          <span>{lowCount} ጥሬ ዕቃዎች ከተፈቀደው ዝቅተኛ የክምችት ወሰን በታች ደርሰዋል! አስቸኳይ ግዢ ወይም አቅርቦት ያከናውኑ።</span>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="erp-card p-4">
        <form method="GET" className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="በዕቃ መለያ (SKU) ወይም በስም ፈልግ..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-ethiopic placeholder:text-slate-400"
            />
          </div>

          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm cursor-pointer hover:bg-slate-50 font-ethiopic text-slate-700">
            <input
              type="checkbox"
              name="low"
              value="1"
              defaultChecked={showLowOnly}
              className="rounded accent-amber-500"
            />
            <span className="text-amber-800 font-semibold">{am.materials.lowStock} ብቻ</span>
          </label>

          <button
            type="submit"
            className="btn-secondary flex items-center gap-2"
          >
            <Filter size={15} />
            <span>{am.filter}</span>
          </button>

          {(params.q || showLowOnly) && (
            <Link
              href="/materials"
              className="text-xs text-slate-500 hover:text-slate-800 font-ethiopic px-2 py-1"
            >
              ማጣሪያዎችን አፅዳ
            </Link>
          )}
        </form>
      </div>

      {/* Main Stock Table */}
      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead>
              <tr>
                <th className="w-28 text-center">{am.materials.sku}</th>
                <th className="text-right">{am.materials.name}</th>
                <th className="w-20 text-center">{am.materials.unit}</th>
                <th className="w-32 text-right">{am.materials.currentStock}</th>
                <th className="w-32 text-right">{am.materials.minimumLevel}</th>
                <th className="w-28 text-center">{am.status}</th>
                {canEdit && <th className="w-36 text-center">{am.actions}</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400 font-ethiopic">
                    <Package size={36} className="mx-auto mb-2 text-slate-300" />
                    <p>{am.noData}</p>
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.id} className={m.isLow ? "bg-amber-50/50 hover:bg-amber-50/80" : "hover:bg-slate-50/80 transition-colors"}>
                    <td className="font-mono text-xs font-semibold text-slate-700 text-center py-3.5">
                      <span className="bg-slate-100 px-2 py-0.5 rounded">
                        {m.sku}
                      </span>
                    </td>
                    <td className="font-ethiopic font-medium text-slate-900 text-right py-3.5">
                      {m.nameAm}
                    </td>
                    <td className="text-center text-slate-600 font-ethiopic text-xs py-3.5">
                      {m.unit}
                    </td>
                    <td className={`tabular-nums font-bold text-right py-3.5 ${m.isLow ? "text-amber-700" : "text-slate-800"}`}>
                      {m.onHand.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                    </td>
                    <td className="tabular-nums text-right text-slate-500 py-3.5">
                      {Number(m.minimumLevel).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-center py-3.5">
                      {m.isLow ? (
                        <span className="badge-danger font-ethiopic">
                          <AlertTriangle size={12} />
                          {am.materials.lowStock}
                        </span>
                      ) : (
                        <span className="badge-verified font-ethiopic">
                          <CheckCircle2 size={12} />
                          በቂ ክምችት
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="text-center py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/materials/${m.id}/movements`}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-ethiopic text-xs flex items-center gap-1"
                            title="የእንቅስቃሴ ታሪክ"
                          >
                            <History size={14} />
                            <span>ታሪክ</span>
                          </Link>
                          <Link
                            href={`/materials/${m.id}/issue`}
                            className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors font-ethiopic text-xs flex items-center gap-1"
                            title={am.materials.issue}
                          >
                            <ArrowUpRight size={14} />
                            <span>{am.materials.issue}</span>
                          </Link>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 font-ethiopic flex justify-between items-center">
          <span>ከ {totalCount} ዕቃዎች ውስጥ {filtered.length} ቀርበዋል</span>
          <span>ጠቅላላ የዕቃ ዓይነቶች፦ {totalCount}</span>
        </div>
        <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
      </div>
    </div>
  );
}
