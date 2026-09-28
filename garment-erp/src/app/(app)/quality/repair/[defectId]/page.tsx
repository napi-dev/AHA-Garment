import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { markRepaired } from "../../actions";
import Link from "next/link";
import { Wrench, CheckCircle2, ArrowLeft, AlertTriangle, Layers, Tag, User } from "lucide-react";

export default async function RepairPage({ params }: { params: Promise<{ defectId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "qc:edit");

  const { defectId } = await params;
  const defect = await db.defect.findUnique({
    where: { id: defectId },
    include: {
      inspection: {
        include: {
          bundle: { include: { cutJob: { include: { order: { include: { style: true } } } } } },
        },
      },
    },
  });
  if (!defect || defect.repaired) notFound();

  const action = markRepaired.bind(null, defectId);
  const bundle = defect.inspection.bundle;

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Navigation */}
      <div>
        <Link
          href="/quality?status=repair"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 font-ethiopic"
        >
          <ArrowLeft size={14} />
          <span>ወደ ማስተካከያ (Repair) ዝርዝር ተመለስ</span>
        </Link>
      </div>

      {/* Card Header */}
      <div className="erp-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider font-ethiopic">
          <Wrench size={14} />
          <span>{am.qc.repairWorkflow}</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          {am.qc.repaired} ምልክት አድርግ
        </h1>
        <p className="text-slate-500 font-ethiopic text-sm mt-0.5">
          ጉድለቱ የተስተካከለበትን ባንድል ወደ ቀጣይ የምርት ሂደት ለማለፍ አረጋግጥ
        </p>

        {/* Details List */}
        <div className="mt-5 divide-y divide-slate-100 rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-2">
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-slate-500 font-ethiopic">የባንድል ኮድ</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{bundle.bundleCode}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-slate-500 font-ethiopic">ስታይል (Style)</span>
            <span className="font-semibold text-slate-900 font-ethiopic text-sm">{bundle.cutJob.order.style.nameAm}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-slate-500 font-ethiopic">የትዕዛዝ ቁጥር</span>
            <span className="font-mono text-xs text-slate-700">{bundle.cutJob.order.orderNumber}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-slate-500 font-ethiopic">{am.qc.defectType}</span>
            <span className="badge-danger font-ethiopic">{defect.defectType}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-slate-500 font-ethiopic">{am.qc.piecesAffected}</span>
            <span className="font-bold text-rose-700 tabular-nums">{defect.piecesAffected} ፍሬ</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-slate-500 font-ethiopic">{am.qc.responsibleStage}</span>
            <span className="badge-draft font-ethiopic">
              {am.stages[defect.responsibleStage as keyof typeof am.stages] ?? defect.responsibleStage}
            </span>
          </div>
        </div>

        <form action={action} className="mt-6 space-y-3">
          <button
            type="submit"
            className="w-full btn-primary bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 py-3.5 flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} />
            <span>ተስተካክሎ ያለቀ (Repaired) አረጋግጥ</span>
          </button>

          <Link
            href="/quality?status=repair"
            className="btn-secondary w-full text-center block"
          >
            {am.cancel}
          </Link>
        </form>
      </div>
    </div>
  );
}
