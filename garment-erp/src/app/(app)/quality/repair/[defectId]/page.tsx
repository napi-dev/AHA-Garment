import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { markRepaired } from "../../actions";

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
      <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{am.qc.repaired} ምልክት አድርግ</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
        <Row label="ባንድል" value={bundle.bundleCode} mono />
        <Row label="ስታይል" value={bundle.cutJob.order.style.nameAm} eth />
        <Row label="ጉድለት" value={defect.defectType} eth />
        <Row label="ፍሬዎች" value={String(defect.piecesAffected)} />
        <Row label="ተጠያቂ ደረጃ" value={am.stages[defect.responsibleStage as keyof typeof am.stages] ?? defect.responsibleStage} eth />
      </div>

      <form action={action}>
        <button type="submit"
          className="w-full py-4 bg-green-600 text-white rounded-xl font-ethiopic font-semibold text-lg hover:bg-green-700 transition-colors">
          ✅ ተጠግኗል ምልክት አድርግ
        </button>
      </form>

      <a href="/quality?status=repair"
        className="block w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-ethiopic font-semibold text-center hover:bg-gray-200 transition-colors">
        {am.back}
      </a>
    </div>
  );
}

function Row({ label, value, mono, eth }: { label: string; value: string; mono?: boolean; eth?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500 font-ethiopic">{label}</span>
      <span className={`text-sm font-medium text-gray-800 ${mono ? "font-mono" : ""} ${eth ? "font-ethiopic" : ""}`}>{value}</span>
    </div>
  );
}
