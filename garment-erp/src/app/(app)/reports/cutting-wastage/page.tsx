import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate, todayISOStringEAT } from "@/lib/ethiopian-calendar";
import Link from "next/link";
import Decimal from "decimal.js";
import { Scissors, AlertTriangle, ArrowLeft, Filter, Layers, CheckCircle2, TrendingDown } from "lucide-react";

export default async function CuttingWastageReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "reports:view");

  const params  = await searchParams;
  const today   = todayISOStringEAT();
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

      {/* Header & Filter Card */}
      <div className="erp-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
              <Scissors size={14} />
              <span>የብክነት ክትትል</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
              {am.reports.CUTTING_WASTAGE}
            </h1>
            <p className="text-slate-500 font-ethiopic text-sm mt-0.5">
              የጨርቅ አጠቃቀም፣ የተቆረጠ የፍሬ ብዛት እና ከሚፈቀደው {limit}% በላይ የሆኑ ብክነቶች ትንተና
            </p>
          </div>

          <form method="GET" className="flex items-end gap-2.5 flex-wrap">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 font-ethiopic">ከቀን</label>
              <input
                type="date"
                name="from"
                defaultValue={fromStr}
                className="input-field text-xs py-2 px-3"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 font-ethiopic">እስከ ቀን</label>
              <input
                type="date"
                name="to"
                defaultValue={toStr}
                className="input-field text-xs py-2 px-3"
              />
            </div>
            <button
              type="submit"
              className="btn-primary text-xs py-2.5 px-4 flex items-center gap-1.5"
            >
              <Filter size={14} />
              <span>{am.filter}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="erp-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">{am.reports.cutJobsCount}</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Scissors size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-2">
            {jobs.length.toLocaleString()}
          </p>
        </div>

        <div className="erp-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">{am.reports.totalPiecesCut}</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-2">
            {totalPieces.toLocaleString()} <span className="text-xs font-normal text-slate-500">ፍሬ</span>
          </p>
        </div>

        <div className="erp-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">{am.reports.avgWastage}</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <TrendingDown size={16} />
            </div>
          </div>
          <p className={`text-2xl font-bold tabular-nums mt-2 ${avgWaste > limit ? "text-rose-600" : "text-emerald-600"}`}>
            {avgWaste.toFixed(2)}%
          </p>
        </div>

        <div className="erp-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 font-ethiopic">&gt; {limit}% ወሰን ያለፉ</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${aboveLimit > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
              {aboveLimit > 0 ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            </div>
          </div>
          <p className={`text-2xl font-bold tabular-nums mt-2 ${aboveLimit > 0 ? "text-rose-600" : "text-emerald-600"}`}>
            {aboveLimit}
          </p>
        </div>
      </div>

      {/* Main Table */}
      <div className="erp-card overflow-hidden">
        <table className="w-full text-left data-table">
          <thead>
            <tr>
              <th>ቀን</th>
              <th>የትዕዛዝ ቁጥር</th>
              <th>ስታይል</th>
              <th className="text-right">የወጣ ጨርቅ (ኪ.ግ)</th>
              <th className="text-right">የተቆረጠ ፍሬ</th>
              <th className="text-center">ብክነት %</th>
              <th className="text-center">{am.status}</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400 font-ethiopic">
                  በተመረጠው የቀን ክልል ውስጥ ምንም የቆረጣ መረጃ አልተገኘም
                </td>
              </tr>
            )}
            {jobs.map((j) => {
              const waste = Number(j.wastagePct);
              const isOver = waste > limit;
              return (
                <tr key={j.id} className={isOver ? "bg-rose-50/30" : ""}>
                  <td className="font-medium text-slate-800 font-ethiopic text-sm">
                    {formatAsEthDate(j.date)}
                  </td>
                  <td className="font-mono text-xs font-semibold text-slate-700">
                    {j.order.orderNumber}
                  </td>
                  <td className="font-medium text-slate-800 font-ethiopic">
                    {j.order.style.nameAm}
                  </td>
                  <td className="tabular-nums font-semibold text-slate-900 text-right">
                    {Number(j.weightUsed).toFixed(3)}
                  </td>
                  <td className="tabular-nums font-semibold text-slate-900 text-right">
                    {j.piecesCut.toLocaleString()}
                  </td>
                  <td className={`tabular-nums font-bold text-center ${isOver ? "text-rose-600" : "text-emerald-700"}`}>
                    {waste.toFixed(2)}%
                  </td>
                  <td className="text-center">
                    {isOver ? (
                      <span className="badge-danger font-ethiopic">
                        ⚠️ ከወሰን በላይ
                      </span>
                    ) : (
                      <span className="badge-verified font-ethiopic">
                        ተቀባይነት ያለው
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {jobs.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 font-bold border-t border-slate-200">
                <td colSpan={4} className="p-3 text-right font-ethiopic text-slate-700">{am.total}</td>
                <td className="p-3 tabular-nums text-right text-slate-900">{totalPieces.toLocaleString()}</td>
                <td className="p-3 tabular-nums text-center text-slate-900">{avgWaste.toFixed(2)}%</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
