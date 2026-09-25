import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { submitInspection } from "../../actions";

const DEFECT_TYPES = [
  "ስፌት ስህተት", "ጨርቅ ጉዳት", "ቀለም ስህተት", "ልኬት ስህተት",
  "ቁልፍ ጉዳት", "ዚፕ ጉዳት", "ቆሻሻ", "ሌላ",
];

const STAGES_AM: Record<string, string> = {
  SEWING:"ስፌት", TRIMMING:"ለቀማ", CUTTING:"ቆረጣ",
  STYLING_HITPRESS:"ሂትፕረስ", IRONING:"ካውያ",
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
      {/* Bundle info */}
      <div>
        <p className="text-sm text-gray-500 font-ethiopic mb-1">
          <a href="/quality" className="hover:underline">ጥራት</a> /
        </p>
        <h1 className="text-2xl font-bold font-mono text-gray-900">{bundle.bundleCode}</h1>
        <p className="text-gray-600 font-ethiopic mt-0.5">
          {bundle.cutJob.order.style.nameAm} · {bundle.quantity} ፍሬ · {bundle.cutJob.order.orderNumber}
        </p>
      </div>

      <form action={action} className="space-y-5">
        {/* Pass / Fail */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="font-semibold text-gray-700 font-ethiopic mb-4">ውጤት</p>
          <div className="flex gap-4">
            <label className="flex-1 cursor-pointer">
              <input type="radio" name="passed" value="true" defaultChecked className="sr-only peer" />
              <div className="w-full py-4 rounded-xl border-2 border-gray-200 text-center font-ethiopic font-semibold transition-all peer-checked:border-green-500 peer-checked:bg-green-50 peer-checked:text-green-700 hover:border-green-300">
                ✅ {am.qc.pass}
              </div>
            </label>
            <label className="flex-1 cursor-pointer">
              <input type="radio" name="passed" value="false" className="sr-only peer" />
              <div className="w-full py-4 rounded-xl border-2 border-gray-200 text-center font-ethiopic font-semibold transition-all peer-checked:border-red-500 peer-checked:bg-red-50 peer-checked:text-red-700 hover:border-red-300">
                ❌ {am.qc.fail}
              </div>
            </label>
          </div>
        </div>

        {/* Defects */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <p className="font-semibold text-gray-700 font-ethiopic">ጉድለቶች (አማራጭ)</p>
          <p className="text-xs text-gray-500 font-ethiopic">ጉድለት ካለ ከዚህ ታች ይጨምሩ</p>

          {/* Up to 3 defect rows */}
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl">
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-ethiopic">{am.qc.defectType}</label>
                <select name={`defect_type_${i}`} className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 font-ethiopic">
                  <option value="">—</option>
                  {DEFECT_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-ethiopic">{am.qc.responsibleStage}</label>
                <select name={`defect_stage_${i}`} className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 font-ethiopic">
                  <option value="">—</option>
                  {Object.entries(STAGES_AM).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-ethiopic">{am.qc.piecesAffected}</label>
                <input name={`defect_pieces_${i}`} type="number" min="1" max={bundle.quantity}
                  className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 tabular-nums" placeholder="0" />
              </div>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2 font-ethiopic">{am.notes}</label>
          <textarea name="notes" rows={2}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 font-ethiopic resize-none text-sm"
            placeholder="ማስታወሻ..." />
        </div>

        <button type="submit"
          className="w-full py-4 bg-purple-600 text-white rounded-xl font-ethiopic font-semibold text-lg hover:bg-purple-700 transition-colors">
          ፍተሻ አስቀምጥ
        </button>
      </form>
    </div>
  );
}
