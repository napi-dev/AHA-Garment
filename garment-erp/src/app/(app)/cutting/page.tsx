import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission, getPageAccess } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import Link from "next/link";
import { Scissors, Plus, AlertTriangle, CheckCircle2, TrendingDown, Package } from "lucide-react";

export default async function CuttingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "/cutting");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [jobs, todayJobsCount, todayPiecesSum, materials] = await Promise.all([
    db.cutJob.findMany({
      include: {
        order: {
          select: { orderNo: true, lines: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.cutJob.count({ where: { date: today } }),
    db.cutJob.aggregate({
      where: { date: today },
      _sum: { piecesCut: true },
    }),
    db.material.findMany({
      select: { id: true, nameAm: true, sku: true },
    }),
  ]);

  const matMap = new Map(materials.map((m) => [m.id, m]));

  const highConsumptionJobs = jobs.filter((j) => Number(j.consumption) > Number(j.limitUsed));
  const avgConsumption = jobs.length > 0
    ? jobs.reduce((sum, j) => sum + Number(j.consumption), 0) / jobs.length
    : 0;

  const access = getPageAccess(session.user.role, "/cutting");
  const canEdit = access === "full";

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
            የተቆረጡ ፍሬዎች፣ የወጣ የጨርቅ ሚዛንና የብክነት ፍጆታ ምዝገባ
          </p>
        </div>

        {canEdit && (
          <Link
            href="/cutting/new"
            className="btn-primary flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 font-ethiopic"
          >
            <Plus size={16} />
            <span>{am.cutting.newCutJob}</span>
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">የዛሬ ቆረጣዎች</p>
            <Scissors size={16} className="text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{todayJobsCount}</p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">የዛሬ የተቆረጠ ፍሬ</p>
            <Package size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">
            {(todayPiecesSum._sum.piecesCut ?? 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">አማካይ ፍጆታ (ኪ.ግ/ፍሬ)</p>
            <TrendingDown size={16} className="text-slate-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">
            {avgConsumption.toFixed(3)}
          </p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">ከወሰን በላይ ፍጆታ</p>
            <AlertTriangle size={16} className={highConsumptionJobs.length > 0 ? "text-rose-500" : "text-slate-400"} />
          </div>
          <p className={`text-2xl font-bold tabular-nums ${highConsumptionJobs.length > 0 ? "text-rose-600" : "text-slate-800"}`}>
            {highConsumptionJobs.length}
          </p>
        </div>
      </div>

      {/* Cutting Jobs Table */}
      <div className="erp-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 font-ethiopic">
            የቅርብ ቆረጣዎች ዝርዝር
          </h2>
          <span className="text-xs text-slate-400 font-ethiopic">
            {jobs.length} ምዝገባዎች
          </span>
        </div>

        {jobs.length === 0 ? (
          <div className="p-12 text-center">
            <Scissors size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-ethiopic text-sm">ምንም የቆረጣ ምዝገባ አልተገኘም</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-ethiopic">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-medium text-right bg-slate-50/50">
                  <th className="py-3 px-4 text-left">ትዕዛዝ</th>
                  <th className="py-3 px-4 text-left">ጨርቅ</th>
                  <th className="py-3 px-4">የተቆረጠበት ቀን</th>
                  <th className="py-3 px-4">የተሰጠ ጨርቅ</th>
                  <th className="py-3 px-4">የተቆረጠ ፍሬ</th>
                  <th className="py-3 px-4">የፍጆታ ስሌት (ኪ.ግ/ፍሬ)</th>
                  <th className="py-3 px-4">ወሰን</th>
                  <th className="py-3 px-4 text-center">ሁኔታ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => {
                  const consumption = Number(job.consumption);
                  const limit = Number(job.limitUsed);
                  const isHigh = consumption > limit;
                  const fabric = matMap.get(job.fabricId);

                  return (
                    <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-left">
                        <span className="font-mono font-bold text-blue-700">
                          {job.order.orderNo}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left text-slate-700">
                        {fabric ? fabric.nameAm : "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {formatAsEthDate(job.date)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                        {Number(job.kgReceived).toFixed(2)} ኪ.ግ
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {job.piecesCut.toLocaleString()} ፍሬ
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        <span className={isHigh ? "text-rose-600 font-extrabold" : "text-emerald-700"}>
                          {consumption.toFixed(4)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {limit.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isHigh ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle size={11} /> ከወሰን በላይ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={11} /> መደበኛ
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
