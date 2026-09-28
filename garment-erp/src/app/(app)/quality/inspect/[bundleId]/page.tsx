import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { submitInspection } from "../../actions";
import Link from "next/link";
import { CheckSquare, AlertTriangle, ArrowLeft, CheckCircle2, XCircle, FileText, Layers, Tag } from "lucide-react";

const DEFECT_TYPES = [
  "ስፌት ስህተት", "ጨርቅ ጉዳት", "ቀለም ስህተት", "ልኬት ስህተት",
  "ቁልፍ ጉዳት", "ዚፕ ጉዳት", "ቆሻሻ", "ሌላ",
];

const STAGES_AM: Record<string, string> = {
  SEWING: "ስፌት (Sewing)",
  TRIMMING: "ለቀማ (Trimming)",
  CUTTING: "ቆረጣ (Cutting)",
  STYLING_HITPRESS: "ሂትፕረስ (Heat Press)",
  IRONING: "ካውያ (Ironing)",
};

export default async function InspectPage({
  params,
}: {
  params: Promise<{ bundleId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "qc:edit");

  const { bundleId } = await params;
  const bundle = await db.bundle.findUnique({
    where: { id: bundleId },
    include: { cutJob: { include: { order: { include: { style: true } } } } },
  });
  if (!bundle) notFound();

  const action = submitInspection.bind(null, bundleId, session.user.id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/quality"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 font-ethiopic"
        >
          <ArrowLeft size={14} />
          <span>ወደ ጥራት ቁጥጥር ዝርዝር ተመለስ</span>
        </Link>
      </div>

      {/* Header Info */}
      <div className="erp-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 uppercase tracking-wider font-ethiopic">
          <CheckSquare size={14} />
          <span>{am.qc.inspect}</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          የጥራት ፍተሻ — <span className="font-mono text-purple-700">{bundle.bundleCode}</span>
        </h1>
        <p className="text-slate-500 font-ethiopic text-sm mt-0.5">
          {bundle.cutJob.order.style.nameAm} · ጠቅላላ {bundle.quantity} ፍሬዎች · ትዕዛዝ #{bundle.cutJob.order.orderNumber}
        </p>
      </div>

      <form action={action} className="space-y-6">
        {/* Pass / Fail Selection */}
        <div className="erp-card p-6">
          <label className="block text-xs font-semibold text-slate-700 mb-3 font-ethiopic">
            የፍተሻ ውጤት (Inspection Verdict) *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="relative flex cursor-pointer rounded-2xl border-2 border-slate-200 p-4 shadow-sm hover:border-emerald-300 focus:outline-none has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50/40 transition-all">
              <input
                type="radio"
                name="passed"
                value="true"
                defaultChecked
                className="sr-only"
              />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 font-ethiopic text-sm">
                    {am.qc.pass}
                  </p>
                  <p className="text-xs text-slate-500 font-ethiopic mt-0.5">
                    ምንም ጎጂ ጉድለት አልተገኘበትም፤ ወደ ቀጣይ ደረጃ ያልፋል
                  </p>
                </div>
              </div>
            </label>

            <label className="relative flex cursor-pointer rounded-2xl border-2 border-slate-200 p-4 shadow-sm hover:border-rose-300 focus:outline-none has-[:checked]:border-rose-600 has-[:checked]:bg-rose-50/40 transition-all">
              <input
                type="radio"
                name="passed"
                value="false"
                className="sr-only"
              />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                  <XCircle size={22} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 font-ethiopic text-sm">
                    {am.qc.fail}
                  </p>
                  <p className="text-xs text-slate-500 font-ethiopic mt-0.5">
                    ጉድለት ተገኝቷል፤ ለማስተካከያ (Repair) ይመለሳል
                  </p>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Defects Section */}
        <div className="erp-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-800 font-ethiopic text-base flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                <span>የተገኙ ጉድለቶች ዝርዝር (Defects)</span>
              </h2>
              <p className="text-xs text-slate-500 font-ethiopic mt-0.5">
                ጉድለት ካለ አይነት፣ የተፈጠረበትን የስራ ደረጃ እና የተጎዳውን የፍሬ ብዛት ይምረጡ
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-ethiopic">
                    {am.qc.defectType} #{i + 1}
                  </label>
                  <select
                    name={`defect_type_${i}`}
                    className="input-field font-ethiopic text-xs py-2"
                  >
                    <option value="">— ይምረጡ —</option>
                    {DEFECT_TYPES.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-ethiopic">
                    {am.qc.responsibleStage}
                  </label>
                  <select
                    name={`defect_stage_${i}`}
                    className="input-field font-ethiopic text-xs py-2"
                  >
                    <option value="">— ደረጃ ይምረጡ —</option>
                    {Object.entries(STAGES_AM).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-ethiopic">
                    {am.qc.piecesAffected}
                  </label>
                  <input
                    name={`defect_pieces_${i}`}
                    type="number"
                    min="1"
                    max={bundle.quantity}
                    className="input-field tabular-nums text-xs py-2"
                    placeholder="0"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="erp-card p-6">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-ethiopic flex items-center gap-1.5">
            <FileText size={14} className="text-slate-400" />
            <span>{am.notes} (አማራጭ)</span>
          </label>
          <textarea
            name="notes"
            rows={2}
            className="input-field font-ethiopic resize-none"
            placeholder="ተጨማሪ የጥራት ማስታወሻ ወይም ዝርዝር ሁኔታ ካለ..."
          />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="btn-primary flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            <CheckSquare size={16} />
            <span>የጥራት ፍተሻውን መዝግብ</span>
          </button>
          <Link
            href="/quality"
            className="btn-secondary flex-1"
          >
            {am.cancel}
          </Link>
        </div>
      </form>
    </div>
  );
}
