import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import Link from "next/link";
import { ShieldCheck, CheckCircle2, Wrench, ClipboardList, Plus } from "lucide-react";

export default async function QualityPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "/quality");

  const params = await searchParams;
  const showRepair = params.status === "repair";

  // Active orders for context
  const activeOrders = await db.prodOrder.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, orderNo: true },
    orderBy: { createdAt: "desc" },
  });

  // Unrepaired defects
  const awaitingRepair = await db.defect.findMany({
    where: { repaired: false },
    include: {
      responsibleDept: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Recent defects (all)
  const recentDefects = await db.defect.findMany({
    include: {
      responsibleDept: true,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const repairedCount = recentDefects.filter((d) => d.repaired).length;
  const repairRate = recentDefects.length > 0 ? Math.round((repairedCount / recentDefects.length) * 100) : 0;

  // Departments for the form
  const departments = await db.department.findMany({
    where: { isActive: true },
    orderBy: { flowOrder: "asc" },
    select: { id: true, nameAm: true },
  });

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
            ጉድለት ቀረጻ እና ጥገና ክትትል
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/quality"
            className={`px-4 py-2.5 rounded-xl text-sm font-ethiopic transition-colors font-semibold flex items-center gap-2 ${!showRepair ? "bg-purple-600 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
            <ClipboardList size={14} /> ጉድለቶች ({recentDefects.length})
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
          <p className="text-xs text-slate-500 font-ethiopic mb-1.5">ጠቅላላ ጉድለቶች (ቅርብ)</p>
          <p className="text-3xl font-bold tabular-nums text-purple-700">{recentDefects.length}</p>
        </div>
        <div className="erp-card p-5">
          <p className="text-xs text-slate-500 font-ethiopic mb-1.5">ለጥገና የሚጠባበቁ</p>
          <p className="text-3xl font-bold tabular-nums text-red-600">{awaitingRepair.length}</p>
        </div>
        <div className="erp-card p-5">
          <p className="text-xs text-slate-500 font-ethiopic mb-1.5">
            የተጠገኑ (%) (ከ{recentDefects.length})
          </p>
          <p className="text-3xl font-bold tabular-nums text-green-700">{repairRate}%</p>
        </div>
      </div>

      {!showRepair ? (
        <div className="space-y-4">
          {/* Record New Defect Form */}
          <div className="erp-card p-6">
            <h2 className="font-semibold text-slate-700 font-ethiopic flex items-center gap-2 mb-4">
              <Plus size={16} className="text-purple-600" /> አዲስ ጉድለት መዝግብ
            </h2>
            <form action={"/quality"} method="POST" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* This is a display-only section pointing to the form page */}
              <Link
                href="/quality/new"
                className="col-span-full flex items-center justify-center gap-2 px-5 py-3 bg-purple-600 text-white rounded-xl text-sm font-ethiopic hover:bg-purple-700 transition-colors font-semibold"
              >
                <Plus size={14} /> አዲስ ጉድለት መዝግብ
              </Link>
            </form>
          </div>

          {/* Recent Defects */}
          <h2 className="font-semibold text-slate-700 font-ethiopic flex items-center gap-2">
            <ShieldCheck size={16} className="text-slate-500" /> የቅርብ ጊዜ ጉድለቶች
          </h2>
          <div className="erp-card overflow-hidden">
            <table className="w-full text-sm data-table">
              <thead>
                <tr>
                  <th>ትዕዛዝ</th>
                  <th>{am.qc.defectType}</th>
                  <th>{am.qc.responsibleStage}</th>
                  <th>{am.qc.piecesAffected}</th>
                  <th>ቀን</th>
                  <th>ሁኔታ</th>
                </tr>
              </thead>
              <tbody>
                {recentDefects.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400 font-ethiopic">{am.noData}</td></tr>
                )}
                {recentDefects.map((d) => (
                  <tr key={d.id}>
                    <td className="font-mono text-xs">{d.orderId.slice(-8)}</td>
                    <td>
                      <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-ethiopic">
                        {d.defectType}
                      </span>
                    </td>
                    <td className="font-ethiopic text-slate-600 text-xs">{d.responsibleDept.nameAm}</td>
                    <td className="text-center tabular-nums font-semibold">{d.piecesAffected}</td>
                    <td className="font-ethiopic text-sm">{formatAsEthDate(d.date)}</td>
                    <td>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-ethiopic font-semibold ${d.repaired ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {d.repaired ? "ተስተካክሏል" : "ያልተስተካከለ"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                    <th>ትዕዛዝ</th>
                    <th>{am.qc.defectType}</th>
                    <th>{am.qc.responsibleStage}</th>
                    <th>{am.qc.piecesAffected}</th>
                    <th>{am.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {awaitingRepair.map((d) => (
                    <tr key={d.id}>
                      <td className="font-mono text-xs">{d.orderId.slice(-8)}</td>
                      <td>
                        <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-ethiopic">
                          {d.defectType}
                        </span>
                      </td>
                      <td className="font-ethiopic text-slate-500 text-xs">{d.responsibleDept.nameAm}</td>
                      <td className="text-center tabular-nums font-semibold">{d.piecesAffected}</td>
                      <td>
                        <Link href={`/quality/repair/${d.id}`}
                          className="text-xs text-blue-600 hover:text-blue-800 font-ethiopic font-semibold flex items-center gap-1">
                          <Wrench size={11} /> {am.qc.repaired}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
