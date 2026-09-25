import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import Link from "next/link";
import Decimal from "decimal.js";

export default async function CuttingWastageReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "reports:view");

  const params  = await searchParams;
  const today   = new Date().toISOString().split("T")[0];
  const fromStr = params.from ?? today;
  const toStr   = params.to   ?? today;
  const from    = new Date(fromStr + "T00:00:00Z");
  const to      = new Date(toStr   + "T23:59:59Z");

  const jobs = await db.cutJob.findMany({
    where: { date: { gte: from, lte: to } },
    include: { order: { include: { style: true } } },
    orderBy: { date: "desc" },
  });

  const limitSetting = await db.appSetting.findUnique({ where: { key: "wastage_alert_pct" } });
  const limit = parseFloat(limitSetting?.value ?? "5.0");

  const aboveLimit = jobs.filter((j) => Number(j.wastagePct) > limit).length;
  const totalPieces = jobs.reduce((s, j) => s + j.piecesCut, 0);
  const avgWaste    = jobs.length > 0
    ? jobs.reduce((s, j) => s + Number(j.wastagePct), 0) / jobs.length
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-gray-500 mb-1">
            <Link href="/reports" className="hover:underline font-ethiopic">ሪፖርቶች</Link> /
          </p>
          <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{am.reports.CUTTING_WASTAGE}</h1>
        </div>
        <form method="GET" className="flex gap-2 items-end flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-ethiopic">ከ</label>
            <input type="date" name="from" defaultValue={fromStr}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-ethiopic">እስከ</label>
            <input type="date" name="to" defaultValue={toStr}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-ethiopic hover:bg-blue-700">{am.filter}</button>
        </form>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SC label="ቆርጦ ቁጥር"         value={String(jobs.length)} />
        <SC label="ጠቅ. ፍሬዎች"         value={totalPieces.toLocaleString()} />
        <SC label="አማካይ ብክነት"         value={`${avgWaste.toFixed(1)}%`}
          color={avgWaste > limit ? "text-red-600" : "text-green-700"} />
        <SC label={`> ${limit}% ብክነት`} value={String(aboveLimit)}
          color={aboveLimit > 0 ? "text-red-600" : "text-green-700"} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm data-table">
          <thead>
            <tr>
              <th>ቀን</th>
              <th>ትዕዛዝ</th>
              <th>ስታይል</th>
              <th>የወጣ (ኪ.ግ)</th>
              <th>ፍሬዎች</th>
              <th>ብክነት %</th>
              <th>{am.status}</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400 font-ethiopic">{am.noData}</td></tr>
            )}
            {jobs.map((j) => {
              const waste = Number(j.wastagePct);
              return (
                <tr key={j.id} className={waste > limit ? "bg-red-50/40" : ""}>
                  <td className="font-ethiopic text-sm">{formatAsEthDate(j.date)}</td>
                  <td className="font-mono text-xs text-gray-700">{j.order.orderNumber}</td>
                  <td className="font-ethiopic text-gray-800">{j.order.style.nameAm}</td>
                  <td className="tabular-nums text-right">{Number(j.weightUsed).toFixed(3)}</td>
                  <td className="tabular-nums text-center">{j.piecesCut.toLocaleString()}</td>
                  <td className={`tabular-nums font-semibold text-center ${waste > limit ? "text-red-600" : "text-green-700"}`}>
                    {waste.toFixed(1)}%
                  </td>
                  <td className="text-center">
                    {waste > limit
                      ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-ethiopic">⚠️ ከወሰን በላይ</span>
                      : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-ethiopic">ጥሩ</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {jobs.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={4} className="p-3 text-right font-ethiopic text-gray-700">{am.total}</td>
                <td className="p-3 tabular-nums text-center">{totalPieces.toLocaleString()}</td>
                <td className="p-3 tabular-nums text-center">{avgWaste.toFixed(1)}%</td>
                <td></td>
              </tr>
            </tfoot>
          )}
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
