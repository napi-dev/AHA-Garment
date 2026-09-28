import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import Link from "next/link";
import { Scissors, Plus, AlertTriangle, CheckCircle2, TrendingDown, Layers } from "lucide-react";

export default async function CuttingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "cuts:view");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [jobs, todayJobsCount, todayPiecesSum] = await Promise.all([
    db.cutJob.findMany({
      include: {
        order: { include: { style: true } },
        bundles: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.cutJob.count({ where: { date: today } }),
    db.cutJob.aggregate({
      where: { date: today },
      _sum: { piecesCut: true },
    }),
  ]);

  const highWastageJobs = jobs.filter((j) => Number(j.wastagePct) > 5);
  const avgWastage = jobs.length > 0
    ? jobs.reduce((sum, j) => sum + Number(j.wastagePct), 0) / jobs.length
    : 0;

  const canEdit = session.user.role === "ADMIN" || session.user.role === "SUPER_MANAGER" || session.user.role === "CUTTING_MANAGER";

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="erp-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-wider font-ethiopic">
            <Scissors size={14} />
            <span>የቆረጣ ክፍል (Cutting Section)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
            {am.cutting.title}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-ethiopic">
            የጨርቅ ፍጆታ፣ የተቆረጡ ፍሬዎች ብዛት እና የብክነት ክትትል
          </p>
        </div>

        {canEdit && (
          <Link
            href="/cutting/new"
            className="btn-primary flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 font-ethiopic"
          >
            <Plus size={16} />
            <span>{am.cutting.newCutJob}</span>
          </Link>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">የዛሬ ቆረጣዎች</p>
            <Scissors size={16} className="text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{todayJobsCount}</p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">የዛሬ የተቆረጠ ፍሬ</p>
            <Layers size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700 tabular-nums">
            {(todayPiecesSum._sum.piecesCut ?? 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">አማካይ ብክነት</p>
            <TrendingDown size={16} className="text-emerald-600" />
          </div>
          <p className={`text-2xl font-bold tabular-nums ${avgWastage > 5 ? "text-rose-600" : "text-emerald-700"}`}>
            {avgWastage.toFixed(1)}%
          </p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">ከወሰን በላይ ብክነት (>5%)</p>
            <AlertTriangle size={16} className={highWastageJobs.length > 0 ? "text-rose-500" : "text-slate-400"} />
          </div>
          <p className={`text-2xl font-bold tabular-nums ${highWastageJobs.length > 0 ? "text-rose-600" : "text-slate-400"}`}>
            {highWastageJobs.length}
          </p>
        </div>
      </div>

      {highWastageJobs.length > 0 && (
        <div className="alert-warning flex items-center gap-2 font-ethiopic text-xs">
          <AlertTriangle size={16} className="text-amber-700 flex-shrink-0" />
          <span>{highWastageJobs.length} የቆረጣ ስራዎች ከተፈቀደው 5% የብክነት ወሰን በላይ ተመዝግበዋል። የቆረጣ ክፍሉ እንዲያጣራ ይመከራል።</span>
        </div>
      )}

      {/* Main Jobs Table */}
      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead>
              <tr>
                <th className="text-right">ቀን</th>
                <th className="text-center">የትዕዛዝ ቁጥር</th>
                <th className="text-right">የስታይል አይነት</th>
                <th className="text-right">የዋለ ጨርቅ (ኪ.ግ)</th>
                <th className="text-center">የተቆረጠ ፍሬ</th>
                <th className="text-center">የጨርቅ ብክነት (%)</th>
                <th className="text-center">ባንድሎች (ጥቅል)</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400 font-ethiopic">
                    <Scissors size={36} className="mx-auto mb-2 text-slate-300" />
                    <p>ምንም የተመዘገበ የቆረጣ ስራ አልተገኘም</p>
                  </td>
                </tr>
              ) : (
                jobs.map((j) => {
                  const waste = Number(j.wastagePct);
                  const isHigh = waste > 5;
                  return (
                    <tr key={j.id} className={isHigh ? "bg-rose-50/50 hover:bg-rose-50/80" : "hover:bg-slate-50/80 transition-colors"}>
                      <td className="font-ethiopic text-slate-700 text-right py-3.5">
                        {formatAsEthDate(j.date)}
                      </td>
                      <td className="font-mono text-xs font-semibold text-slate-700 text-center py-3.5">
                        <span className="bg-slate-100 px-2 py-0.5 rounded">
                          {j.order.orderNumber}
                        </span>
                      </td>
                      <td className="font-ethiopic font-medium text-slate-900 text-right py-3.5">
                        {j.order.style.nameAm}
                      </td>
                      <td className="tabular-nums text-right text-slate-800 font-medium py-3.5">
                        {Number(j.weightUsed).toFixed(3)} ኪ.ግ
                      </td>
                      <td className="tabular-nums text-center font-bold text-slate-800 py-3.5">
                        {j.piecesCut.toLocaleString()}
                      </td>
                      <td className="text-center py-3.5">
                        <span className={`inline-flex items-center gap-1 font-bold text-xs px-2.5 py-0.5 rounded-full tabular-nums ${isHigh ? "bg-rose-100 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                          {isHigh && <AlertTriangle size={12} />}
                          {waste.toFixed(2)}%
                        </span>
                      </td>
                      <td className="text-center py-3.5">
                        <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-mono font-semibold">
                          {j.bundles.length} ባንድሎች
                        </span>
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
