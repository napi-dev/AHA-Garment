import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate, todayISOStringEAT } from "@/lib/ethiopian-calendar";
import Link from "next/link";
import Decimal from "decimal.js";
import { Warehouse, ArrowLeft, Filter, FileDown, AlertTriangle, ArrowUpRight, ArrowDownLeft, CheckCircle2 } from "lucide-react";

export default async function InventoryReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "reports:view");

  const params  = await searchParams;
  const dateStr = params.date ?? todayISOStringEAT();
  const date    = new Date(dateStr + "T00:00:00Z");
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  const materials = await db.material.findMany({
    where: { isActive: true },
    include: {
      stockMovements: { orderBy: { date: "desc" } },
    },
    orderBy: { sku: "asc" },
  });

  // Compute on-hand up to selected date
  const rows = materials.map((m) => {
    let onHand = new Decimal(0);
    let todayIn = new Decimal(0);
    let todayOut = new Decimal(0);

    for (const mv of m.stockMovements) {
      const q = new Decimal(mv.quantity.toString());
      const isIn = mv.type === "RECEIVE" || mv.type === "RETURN";
      if (mv.date <= date) {
        onHand = isIn ? onHand.plus(q) : onHand.minus(q);
      }
      // Today's movements
      if (mv.date >= date && mv.date < nextDay) {
        if (isIn) todayIn = todayIn.plus(q);
        else todayOut = todayOut.plus(q);
      }
    }

    return {
      ...m,
      onHand,
      todayIn,
      todayOut,
      isLow: onHand.lte(new Decimal(m.minimumLevel.toString())),
    };
  });

  const lowCount = rows.filter((r) => r.isLow).length;
  const totalTodayOut = rows.reduce((s, r) => s.plus(r.todayOut), new Decimal(0));
  const totalTodayIn = rows.reduce((s, r) => s.plus(r.todayIn), new Decimal(0));

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 font-ethiopic"
        >
          <ArrowLeft size={14} />
          <span>ወደ ሪፖርቶች ማጠቃለያ ተመለስ</span>
        </Link>
      </div>

      {/* Header & Controls */}
      <div className="erp-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
              <Warehouse size={14} />
              <span>የጥሬ ዕቃ ክምችት</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
              {am.reports.DAILY_INVENTORY}
            </h1>
            <p className="text-slate-500 font-ethiopic text-sm mt-0.5">
              ዕለታዊ የጥሬ ዕቃዎች ገቢ፣ ወጪ እና በስቶክ የሚገኝ ሚዛን — <span className="font-semibold text-slate-700">{formatAsEthDate(date)}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <form method="GET" className="flex items-center gap-2">
              <input
                type="date"
                name="date"
                defaultValue={dateStr}
                className="input-field text-xs py-2 px-3"
              />
              <button
                type="submit"
                className="btn-primary text-xs py-2.5 px-4 flex items-center gap-1.5"
              >
                <Filter size={14} />
                <span>{am.filter}</span>
              </button>
            </form>
            <a
              href={`/api/pdf/inventory?date=${dateStr}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs py-2.5 px-4 flex items-center gap-1.5"
            >
              <FileDown size={14} />
              <span>PDF አውርድ</span>
            </a>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="erp-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">ጠቅላላ ጥሬ ዕቃዎች</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Warehouse size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-2">
            {rows.length} <span className="text-xs font-normal text-slate-500">አይነት</span>
          </p>
        </div>

        <div className="erp-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">{am.materials.lowStock}</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${lowCount > 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
              {lowCount > 0 ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            </div>
          </div>
          <p className={`text-2xl font-bold tabular-nums mt-2 ${lowCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {lowCount} <span className="text-xs font-normal text-slate-500">እቃዎች</span>
          </p>
        </div>

        <div className="erp-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">{am.reports.todayIn}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-2">
            {totalTodayIn.toFixed(2)}
          </p>
        </div>

        <div className="erp-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">{am.reports.todayOut}</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-indigo-700 tabular-nums mt-2">
            {totalTodayOut.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="erp-card overflow-hidden">
        <table className="w-full text-left data-table">
          <thead>
            <tr>
              <th className="w-24">{am.materials.sku}</th>
              <th>{am.materials.name}</th>
              <th className="text-center w-16">{am.materials.unit}</th>
              <th className="text-right">{am.reports.todayIn}</th>
              <th className="text-right">{am.reports.todayOut}</th>
              <th className="text-right">{am.reports.onHand}</th>
              <th className="text-right">ዝቅተኛ ወሰን</th>
              <th className="text-center">{am.status}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.isLow ? "bg-amber-50/30" : ""}>
                <td className="font-mono text-xs font-semibold text-slate-600">{r.sku}</td>
                <td className="font-semibold text-slate-800 font-ethiopic">{r.nameAm}</td>
                <td className="text-center font-mono text-xs text-slate-500">{r.unit}</td>
                <td className={`tabular-nums font-semibold text-right ${r.todayIn.gt(0) ? "text-emerald-700" : "text-slate-300"}`}>
                  {r.todayIn.gt(0) ? `+${r.todayIn.toFixed(3)}` : "—"}
                </td>
                <td className={`tabular-nums font-semibold text-right ${r.todayOut.gt(0) ? "text-indigo-600" : "text-slate-300"}`}>
                  {r.todayOut.gt(0) ? `−${r.todayOut.toFixed(3)}` : "—"}
                </td>
                <td className={`tabular-nums font-bold text-right ${r.isLow ? "text-amber-700" : "text-slate-900"}`}>
                  {r.onHand.toFixed(3)}
                </td>
                <td className="tabular-nums text-right text-slate-400 text-xs">
                  {new Decimal(r.minimumLevel.toString()).toFixed(2)}
                </td>
                <td className="text-center">
                  {r.isLow ? (
                    <span className="badge-danger font-ethiopic">
                      ⚠️ ዝቅተኛ
                    </span>
                  ) : (
                    <span className="badge-verified font-ethiopic">
                      በቂ
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
