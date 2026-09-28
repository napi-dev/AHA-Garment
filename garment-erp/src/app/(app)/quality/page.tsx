import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import Link from "next/link";
import { ShieldCheck, CheckCircle2, Wrench, ClipboardList, ArrowRight } from "lucide-react";

export default async function QualityPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "qc:view");

  const params = await searchParams;
  const showRepair = params.status === "repair";

  const awaitingQC = await db.bundle.findMany({
    where: { currentStage: "QUALITY_CONTROL" },
    include: {
      cutJob: { include: { order: { include: { style: true } } } },
      qcInspections: { orderBy: { inspectedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });

  const awaitingRepair = await db.defect.findMany({
    where: { repaired: false },
    include: {
      inspection: {
        include: {
          bundle: { include: { cutJob: { include: { order: { include: { style: true } } } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const recentInspections = await db.qcInspection.findMany({
    include: {
      bundle: { include: { cutJob: { include: { order: { include: { style: true } } } } } },
      defects: true,
    },
    orderBy: { inspectedAt: "desc" },
    take: 20,
  });

  const passCount = recentInspections.filter((i) => i.passed).length;
  const passRate = recentInspections.length > 0 ? Math.round((passCount / recentInspections.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="erp-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 uppercase tracking-wider font-ethiopic">
            <ShieldCheck size={14} />
            <span>የጥራት ቁጥጥር ክፍል</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">{am.qc.title}</h1>
          <p className="text-slate-500 text-sm mt-0.5 font-ethiopic">
            ባንድሎች ፍተሻ፣ ጉድለት ቀረጻ እና ጥገና ክትትል
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/quality"
            className={`px-4 py-2.5 rounded-xl text-sm font-ethiopic transition-colors font-semibold flex items-center gap-2 ${!showRepair ? "bg-purple-600 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
            <ClipboardList size={14} /> {am.qc.inspect} ({awaitingQC.length})
          </Link>
          <Link href="/quality?status=repair"
            className={`px-4 py-2.5 rounded-xl text-sm font-ethiopic transition-colors font-semibold flex items-center gap-2 ${showRepair ? "bg-red-600 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
            <Wrench size={14} /> {am.qc.sendBack} ({awaitingRepair.length})
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="erp-card p-5">
          <p className="text-xs text-slate-500 font-ethiopic mb-1.5">ለፍተሻ ዝግጁ</p>
          <p className="text-3xl font-bold tabular-nums text-purple-700">{awaitingQC.length}</p>
        </div>
        <div className="erp-card p-5">
          <p className="text-xs text-slate-500 font-ethiopic mb-1.5">ለጥገና የሚጠባበቁ</p>
          <p className="text-3xl font-bold tabular-nums text-red-600">{awaitingRepair.length}</p>
        </div>
        <div className="erp-card p-5">
          <p className="text-xs text-slate-500 font-ethiopic mb-1.5">
            ያለፉ (%)(ከ{recentInspections.length})
          </p>
          <p className="text-3xl font-bold tabular-nums text-green-700">{passRate}%</p>
        </div>
      </div>

      {!showRepair ? (
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-700 font-ethiopic flex items-center gap-2">
            <ClipboardList size={16} className="text-purple-600" /> ለፍተሻ ዝግጁ ባንድሎች
          </h2>
          {awaitingQC.length === 0 && (
            <div className="erp-card p-10 text-center">
              <CheckCircle2 size={40} className="mx-auto text-green-400 mb-3" />
              <p className="font-ethiopic text-green-700 font-semibold">ሁሉም ባንድሎች ፍተሻ ወስደዋል</p>
            </div>
          )}
          {awaitingQC.map((bundle) => (
            <div key={bundle.id} className="erp-card p-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-sm font-bold text-slate-800">{bundle.bundleCode}</p>
                <p className="font-ethiopic text-slate-600 text-sm mt-0.5">{bundle.cutJob.order.style.nameAm}</p>
                <p className="text-xs text-slate-400 tabular-nums mt-0.5">
                  {bundle.quantity} ፍሬ · {bundle.cutJob.order.orderNumber}
                </p>
              </div>
              <Link href={`/quality/inspect/${bundle.id}`}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-ethiopic hover:bg-purple-700 transition-colors flex-shrink-0 font-semibold">
                {am.qc.inspect} <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-700 font-ethiopic flex items-center gap-2">
            <Wrench size={16} className="text-red-600" /> ጥገና የሚጠባበቁ ጉድለቶች
          </h2>
          {awaitingRepair.length === 0 && (
            <div className="erp-card p-10 text-center">
              <CheckCircle2 size={40} className="mx-auto text-green-400 mb-3" />
              <p className="font-ethiopic text-green-700 font-semibold">ምንም ጥገና አስፈላጊ የለም</p>
            </div>
          )}
          {awaitingRepair.length > 0 && (
            <div className="erp-card overflow-hidden">
              <table className="w-full text-sm data-table">
                <thead>
                  <tr>
                    <th>ባንድል</th>
                    <th>ስታይል</th>
                    <th>{am.qc.defectType}</th>
                    <th>{am.qc.responsibleStage}</th>
                    <th>{am.qc.piecesAffected}</th>
                    <th>{am.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {awaitingRepair.map((d) => {
                    const bundle = d.inspection.bundle;
                    return (
                      <tr key={d.id}>
                        <td className="font-mono text-xs">{bundle.bundleCode}</td>
                        <td className="font-ethiopic text-slate-700">{bundle.cutJob.order.style.nameAm}</td>
                        <td>
                          <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-ethiopic">
                            {d.defectType}
                          </span>
                        </td>
                        <td className="font-ethiopic text-slate-500 text-xs">
                          {am.stages[d.responsibleStage as keyof typeof am.stages] ?? d.responsibleStage}
                        </td>
                        <td className="text-center tabular-nums font-semibold">{d.piecesAffected}</td>
                        <td>
                          <Link href={`/quality/repair/${d.id}`}
                            className="text-xs text-blue-600 hover:text-blue-800 font-ethiopic font-semibold flex items-center gap-1">
                            <Wrench size={11} /> {am.qc.repaired}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Recent inspections */}
      <div>
        <h2 className="font-semibold text-slate-700 font-ethiopic mb-3 flex items-center gap-2">
          <ShieldCheck size={16} className="text-slate-500" /> የቅርብ ጊዜ ፍተሻዎች
        </h2>
        <div className="erp-card overflow-hidden">
          <table className="w-full text-sm data-table">
            <thead>
              <tr>
                <th>ባንድል</th>
                <th>ስታይል</th>
                <th>ቀን</th>
                <th>ውጤት</th>
                <th>ጉድለቶች</th>
              </tr>
            </thead>
            <tbody>
              {recentInspections.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400 font-ethiopic">{am.noData}</td></tr>
              )}
              {recentInspections.map((ins) => (
                <tr key={ins.id}>
                  <td className="font-mono text-xs">{ins.bundle.bundleCode}</td>
                  <td className="font-ethiopic text-slate-700">{ins.bundle.cutJob.order.style.nameAm}</td>
                  <td className="font-ethiopic text-sm">{formatAsEthDate(ins.inspectedAt)}</td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-ethiopic font-semibold ${ins.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {ins.passed ? am.qc.pass : am.qc.fail}
                    </span>
                  </td>
                  <td className="text-center tabular-nums text-slate-500">{ins.defects.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
