import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate, todayISOStringEAT } from "@/lib/ethiopian-calendar";
import { updateIncentiveCard } from "./actions";
import { IncentiveCardSaveButton } from "./save-button";
import Link from "next/link";
import Decimal from "decimal.js";
import { Award, ArrowLeft, Calendar, History, Info, CheckCircle2 } from "lucide-react";

export default async function IncentiveCardPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "incentive_card:edit");

  const params = await searchParams;
  const justSaved = params.saved === "1";

  const today = todayISOStringEAT();

  // All departments with their current active card
  const departments = await db.department.findMany({
    where: { isActive: true },
    include: {
      incentiveCards: {
        where: { effectiveTo: null },
        orderBy: { effectiveFrom: "desc" },
        take: 1,
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 font-ethiopic"
        >
          <ArrowLeft size={14} />
          <span>ወደ ቅንብሮች ማጠቃለያ ተመለስ</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="erp-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
          <Award size={14} />
          <span>የክፍያ ተመን ቅንብር</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          {am.settings.incentiveCard}
        </h1>
        <p className="text-slate-500 font-ethiopic text-sm mt-0.5">
          ለእያንዳንዱ የስራ ክፍል የሰዓት ዒላማ (Target) እና ከተጨማሪ ፍሬ የሚከፈለውን የብር ተመን እዚህ ያዋቅሩ
        </p>
      </div>

      {/* Notice Alert */}
      <div className="alert-info flex items-start gap-3">
        <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-900 font-ethiopic leading-relaxed">
          የተመኑ ለውጦች የሚጸኑት ከተጠቀሰው <strong>ሥራ ላይ የሚውልበት ቀን</strong> ጀምሮ ነው። ቀደም ሲል ለተዘጉ ወይም ለተሰሩ ቀናት የነበረው ክፍያ በወቅቱ በነበረው ተመን መሠረት ጸንቶ ይቆያል።
        </p>
      </div>

      {/* Success banner — shown after save */}
      {justSaved && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-semibold font-ethiopic">
            ኢንሴንቲቭ ካርዱ በተሳካ ሁኔታ ተቀምጧል! ከዚህ በታች ያለው ታሪክ ዝርዝር ዘምኗል።
          </p>
          <a href="#history" className="ml-auto text-xs font-semibold text-emerald-700 hover:underline font-ethiopic whitespace-nowrap">
            ወደ ታሪክ ሂድ ↓
          </a>
        </div>
      )}

      {/* Department Cards Grid or Table */}
      <div className="space-y-4">
        {departments.map((dept) => {
          const card = dept.incentiveCards[0];
          const action = updateIncentiveCard.bind(null, dept.id, session.user.id);

          return (
            <form
              key={dept.id}
              action={action}
              className="erp-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="min-w-[180px]">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 font-ethiopic text-base">
                    {dept.nameAm}
                  </h3>
                  <span className="badge-draft text-[11px] font-ethiopic">
                    {am.stages[dept.stage as keyof typeof am.stages] ?? dept.stage}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-ethiopic mt-1">
                  ወቅታዊ ተመን፦ {card ? `${formatAsEthDate(card.effectiveFrom)} ጀምሮ` : "ተመን አልተመደበም"}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 max-w-2xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 font-ethiopic">
                    {am.incentive.targetPerHour} (ፍሬ/ሰዓት)
                  </label>
                  <input
                    name="targetPerHour"
                    type="number"
                    min="0"
                    max="9999"
                    defaultValue={card?.targetPerHour ?? 0}
                    required
                    className="input-field text-xs py-2 px-3 tabular-nums font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 font-ethiopic">
                    {am.incentive.ratePerPiece} (ብር/ፍሬ)
                  </label>
                  <input
                    name="ratePerPiece"
                    type="number"
                    min="0"
                    step="0.0001"
                    max="99"
                    defaultValue={card ? new Decimal(card.ratePerPiece.toString()).toFixed(4) : "0.0000"}
                    required
                    className="input-field text-xs py-2 px-3 tabular-nums font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 font-ethiopic">
                    {am.settings.effectiveDate}
                  </label>
                  <input
                    name="effectiveFrom"
                    type="date"
                    defaultValue={today}
                    required
                    className="input-field text-xs py-2 px-3"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <IncentiveCardSaveButton />
              </div>
            </form>
          );
        })}
      </div>

      {/* Card History */}
      <CardHistory />
    </div>
  );
}

async function CardHistory() {
  const history = await db.incentiveCard.findMany({
    where: { effectiveTo: { not: null } },
    include: { department: { select: { nameAm: true } } },
    orderBy: { effectiveFrom: "desc" },
    take: 15,
  });

  if (history.length === 0) return null;

  return (
    <div id="history" className="erp-card overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200/80 flex items-center gap-2">
        <History size={16} className="text-slate-400" />
        <h2 className="font-bold text-slate-800 font-ethiopic text-sm">
          የቀደምት ካርዶች ታሪክ (Incentive Card History)
        </h2>
      </div>
      <table className="w-full text-left data-table">
        <thead>
          <tr>
            <th>የስራ ክፍል</th>
            <th className="text-center">{am.incentive.targetPerHour}</th>
            <th className="text-center">{am.incentive.ratePerPiece}</th>
            <th>የጀመረበት ቀን</th>
            <th>የተጠናቀቀበት ቀን</th>
          </tr>
        </thead>
        <tbody>
          {history.map((c) => (
            <tr key={c.id}>
              <td className="font-semibold text-slate-700 font-ethiopic">{c.department.nameAm}</td>
              <td className="tabular-nums font-semibold text-center text-slate-800">{c.targetPerHour}</td>
              <td className="tabular-nums font-semibold text-center text-emerald-700">
                {new Decimal(c.ratePerPiece.toString()).toFixed(4)} ብር
              </td>
              <td className="font-ethiopic text-xs text-slate-500">{formatAsEthDate(c.effectiveFrom)}</td>
              <td className="font-ethiopic text-xs text-slate-500">{c.effectiveTo ? formatAsEthDate(c.effectiveTo) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
