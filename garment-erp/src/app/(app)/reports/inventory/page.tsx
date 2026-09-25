import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import Link from "next/link";
import Decimal from "decimal.js";

export default async function InventoryReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "reports:view");

  const params  = await searchParams;
  const dateStr = params.date ?? new Date().toISOString().split("T")[0];
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-gray-500 mb-1">
            <Link href="/reports" className="hover:underline font-ethiopic">ሪፖርቶች</Link> /
          </p>
          <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{am.reports.DAILY_INVENTORY}</h1>
          <p className="text-gray-500 text-sm mt-0.5 font-ethiopic">{formatAsEthDate(date)}</p>
        </div>
        <div className="flex gap-2 items-center">
          <form method="GET" className="flex gap-2">
            <input type="date" name="date" defaultValue={dateStr}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-ethiopic hover:bg-blue-700">{am.filter}</button>
          </form>
          <a href={`/api/pdf/inventory?date=${dateStr}`} target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-ethiopic hover:bg-gray-200">
            PDF ↓
          </a>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <SC label="ጥሬ እቃዎች" value={String(rows.length)} />
        <SC label={am.materials.lowStock} value={String(lowCount)}
          color={lowCount > 0 ? "text-orange-600" : "text-green-600"} />
        <SC label="ዛሬ ወጪ"
          value={rows.reduce((s, r) => s.plus(r.todayOut), new Decimal(0)).toFixed(3)} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm data-table">
          <thead>
            <tr>
              <th className="w-24">{am.materials.sku}</th>
              <th>{am.materials.name}</th>
              <th className="w-14">{am.materials.unit}</th>
              <th>ዛሬ ደርሷል</th>
              <th>ዛሬ ወጣ</th>
              <th>ያለ ክምችት</th>
              <th>ዝቅ. ወሰን</th>
              <th>{am.status}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.isLow ? "bg-orange-50/50" : ""}>
                <td className="font-mono text-xs text-gray-600">{r.sku}</td>
                <td className="font-ethiopic text-gray-800 font-medium">{r.nameAm}</td>
                <td className="text-center text-gray-500">{r.unit}</td>
                <td className={`tabular-nums text-right ${r.todayIn.gt(0) ? "text-green-700 font-medium" : "text-gray-300"}`}>
                  {r.todayIn.gt(0) ? `+${r.todayIn.toFixed(3)}` : "—"}
                </td>
                <td className={`tabular-nums text-right ${r.todayOut.gt(0) ? "text-red-600 font-medium" : "text-gray-300"}`}>
                  {r.todayOut.gt(0) ? `−${r.todayOut.toFixed(3)}` : "—"}
                </td>
                <td className={`tabular-nums font-semibold text-right ${r.isLow ? "text-orange-700" : "text-gray-800"}`}>
                  {r.onHand.toFixed(3)}
                </td>
                <td className="tabular-nums text-right text-gray-400">
                  {new Decimal(r.minimumLevel.toString()).toFixed(2)}
                </td>
                <td className="text-center">
                  {r.isLow
                    ? <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-ethiopic">⚠️ ዝቅተኛ</span>
                    : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-ethiopic">ጥሩ</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SC({ label, value, color = "text-gray-800" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-500 font-ethiopic mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
