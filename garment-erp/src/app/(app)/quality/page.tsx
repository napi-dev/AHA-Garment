import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import Link from "next/link";

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

  // Bundles awaiting QC (currently at QUALITY_CONTROL stage)
  const awaitingQC = await db.bundle.findMany({
    where: { currentStage: "QUALITY_CONTROL" },
    include: {
      cutJob: { include: { order: { include: { style: true } } } },
      qcInspections: { orderBy: { inspectedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });

  // Defects awaiting repair
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

  // Recent inspections
  const recentInspections = await db.qcInspection.findMany({
    include: {
      bundle: { include: { cutJob: { include: { order: { include: { style: true } } } } } },
      defects: true,
    },
    orderBy: { inspectedAt: "desc" },
    take: 20,
  });

  const passCount = recentInspections.filter((i) => i.passed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{am.qc.title}</h1>
        <div className="flex gap-2">
          <Link href="/quality"
            className={`px-4 py-2 rounded-xl text-sm font-ethiopic transition-colors ${!showRepair ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            {am.qc.inspect} ({awaitingQC.length})
          </Link>
          <Link href="/quality?status=repair"
            className={`px-4 py-2 rounded-xl text-sm font-ethiopic transition-colors ${showRepair ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            {am.qc.sendBack} ({awaitingRepair.length})
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="ለፍተሻ ዝግጁ" value={awaitingQC.length} color="text-purple-700" />
        <StatCard label="ለጥገና የሚጠባበቁ" value={awaitingRepair.length} color="text-red-600" />
        <StatCard label={`ያለፉ (ከ${recentInspections.length})`} value={passCount} color="text-green-700" />
      </div>

      {!showRepair ? (
        // Bundles awaiting QC
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-700 font-ethiopic">ለፍተሻ ዝግጁ ባንድሎች</h2>
          {awaitingQC.length === 0 && (
            <div className="bg-green-50 rounded-2xl p-8 text-center">
              <p className="text-4xl mb-2">✅</p>
              <p className="font-ethiopic text-green-700">ሁሉም ባንድሎች ፍተሻ ወስደዋል</p>
            </div>
          )}
          {awaitingQC.map((bundle) => (
            <div key={bundle.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-sm font-bold text-gray-800">{bundle.bundleCode}</p>
                <p className="font-ethiopic text-gray-600 text-sm">{bundle.cutJob.order.style.nameAm}</p>
                <p className="text-xs text-gray-400 tabular-nums mt-0.5">
                  {bundle.quantity} ፍሬ · {bundle.cutJob.order.orderNumber}
                </p>
              </div>
              <Link href={`/quality/inspect/${bundle.id}`}
                className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-ethiopic hover:bg-purple-700 transition-colors flex-shrink-0">
                {am.qc.inspect} →
              </Link>
            </div>
          ))}
        </div>
      ) : (
        // Defects awaiting repair
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-700 font-ethiopic">ጥገና የሚጠባበቁ</h2>
          {awaitingRepair.length === 0 && (
            <div className="bg-green-50 rounded-2xl p-8 text-center">
              <p className="text-4xl mb-2">✅</p>
              <p className="font-ethiopic text-green-700">ምንም ጥገና የለም</p>
            </div>
          )}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                      <td className="font-ethiopic text-gray-700">{bundle.cutJob.order.style.nameAm}</td>
                      <td className="font-ethiopic text-red-600">{d.defectType}</td>
                      <td className="font-ethiopic text-gray-500 text-xs">
                        {am.stages[d.responsibleStage as keyof typeof am.stages] ?? d.responsibleStage}
                      </td>
                      <td className="text-center tabular-nums">{d.piecesAffected}</td>
                      <td>
                        <Link href={`/quality/repair/${d.id}`}
                          className="text-xs text-blue-600 hover:underline font-ethiopic">
                          {am.qc.repaired}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent inspections */}
      <div>
        <h2 className="font-semibold text-gray-700 font-ethiopic mb-3">የቅርብ ጊዜ ፍተሻዎች</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
              {recentInspections.map((ins) => (
                <tr key={ins.id}>
                  <td className="font-mono text-xs">{ins.bundle.bundleCode}</td>
                  <td className="font-ethiopic text-gray-700">{ins.bundle.cutJob.order.style.nameAm}</td>
                  <td className="font-ethiopic text-sm">{formatAsEthDate(ins.inspectedAt)}</td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-ethiopic ${ins.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {ins.passed ? am.qc.pass : am.qc.fail}
                    </span>
                  </td>
                  <td className="text-center tabular-nums text-gray-500">{ins.defects.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-500 font-ethiopic mb-1">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
