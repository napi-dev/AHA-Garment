import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate, todayISOStringEAT } from "@/lib/ethiopian-calendar";
import { updateIncentiveCard } from "./actions";
import { IncentiveCardSaveButton } from "./save-button";
import Link from "next/link";
import { Award, ArrowLeft, Calendar, History, Info, CheckCircle2, Briefcase } from "lucide-react";

export default async function IncentiveCardPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "/settings");

  const params = await searchParams;
  const justSaved = params.saved === "1";

  const today = todayISOStringEAT();

  // All departments with jobs and their current active card
  const departments = await db.department.findMany({
    where: { isActive: true },
    include: {
      jobs: {
        where: { isActive: true },
        include: {
          incentiveCards: {
            where: { effectiveTo: null },
            orderBy: { effectiveFrom: "desc" },
            take: 1,
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { flowOrder: "asc" },
  });

  // Recent history of card changes
  const cardHistory = await db.incentiveCard.findMany({
    take: 30,
    orderBy: { effectiveFrom: "desc" },
    include: {
      job: {
        include: { department: true },
      },
    },
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
          ለእያንዳንዱ የስራ ዓይነት (Job) የሰዓት ዒላማ (Target) እና ከተጨማሪ ፍሬ የሚከፈለውን የብር ተመን እዚህ ያዋቅሩ
        </p>
      </div>

      {/* Notice Alert */}
      <div className="alert-info flex items-start gap-3">
        <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-900 font-ethiopic leading-relaxed">
          የተመኑ ለውጦች የሚጸኑት ከተጠቀሰው <strong>ሥራ ላይ የሚውልበት ቀን</strong> ጀምሮ ነው። ቀደም ሲል ለተዘጉ ወይም ለተሰሩ ቀናት የነበረው ክፍያ በወቅቱ በነበረው ተመን መሠረት ጸንቶ ይቆያል።
        </p>
      </div>

      {/* Success banner */}
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

      {/* Department Cards with Jobs */}
      <div className="space-y-6">
        {departments.map((dept) => {
          if (!dept.jobs.length) return null;
          return (
            <div key={dept.id} className="erp-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 font-ethiopic text-base">
                    {dept.nameAm}
                  </h3>
                  <span className="text-xs text-slate-400 font-ethiopic">
                    ({dept.jobs.length} የስራ ዓይነቶች)
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {dept.jobs.map((job) => {
                  const card = job.incentiveCards[0];
                  const action = updateIncentiveCard.bind(null, job.id, session.user.id);

                  return (
                    <form
                      key={job.id}
                      action={action}
                      className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="min-w-[200px]">
                        <div className="flex items-center gap-2">
                          <Briefcase size={15} className="text-blue-600 flex-shrink-0" />
                          <h4 className="font-semibold text-slate-800 font-ethiopic text-sm">
                            {job.nameAm}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-400 font-ethiopic mt-1">
                          ወቅታዊ ተመን፦ {card ? `${formatAsEthDate(card.effectiveFrom)} ጀምሮ` : "ተመን አልተመደበም"}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 max-w-xl">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1 font-ethiopic">
                            {am.incentive.targetPerHour} (ፍሬ/ሰዓት)
                          </label>
                          <input
                            name="targetPerHour"
                            type="number"
                            min="0"
                            required
                            defaultValue={card?.targetPerHour ?? 0}
                            className="input-field text-right font-mono font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1 font-ethiopic">
                            {am.incentive.ratePerPiece} (ብር/ፍሬ)
                          </label>
                          <input
                            name="ratePerPiece"
                            type="number"
                            step="0.0001"
                            min="0"
                            required
                            defaultValue={card ? Number(card.ratePerPiece).toFixed(4) : "0.0000"}
                            className="input-field text-right font-mono font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1 font-ethiopic">
                            ሥራ ላይ የሚውልበት ቀን
                          </label>
                          <input
                            name="effectiveFrom"
                            type="date"
                            defaultValue={today}
                            required
                            className="input-field text-sm font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end self-end lg:self-center">
                        <IncentiveCardSaveButton />
                      </div>
                    </form>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* History Table */}
      <div id="history" className="erp-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <History size={16} className="text-slate-500" />
          <h2 className="text-base font-bold text-slate-900 font-ethiopic">
            የተመን ለውጦች ታሪክ (የቅርብ 30 ምዝገባዎች)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-ethiopic">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-medium text-right">
                <th className="py-2.5 px-3 text-left">የስራ ክፍል</th>
                <th className="py-2.5 px-3 text-left">የስራ ዓይነት</th>
                <th className="py-2.5 px-3">የሰዓት ዒላማ</th>
                <th className="py-2.5 px-3">የፍሬ ተመን</th>
                <th className="py-2.5 px-3">የጀመረበት ቀን</th>
                <th className="py-2.5 px-3">የተጠናቀቀበት ቀን</th>
                <th className="py-2.5 px-3 text-center">ሁኔታ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cardHistory.map((c) => {
                const isActive = !c.effectiveTo;
                return (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 text-left">
                      {c.job.department.nameAm}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 text-left">
                      {c.job.nameAm}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                      {c.targetPerHour} ፍሬ/ሰዓት
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">
                      {Number(c.ratePerPiece).toFixed(4)} ብር
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                      {formatAsEthDate(c.effectiveFrom)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                      {c.effectiveTo ? formatAsEthDate(c.effectiveTo) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {isActive ? (
                        <span className="badge-confirmed text-[10px]">በሥራ ላይ</span>
                      ) : (
                        <span className="badge-draft text-[10px]">ያለፈ</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
