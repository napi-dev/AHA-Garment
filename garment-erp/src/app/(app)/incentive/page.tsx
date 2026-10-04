import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPageAccess, canCloseIncentive, canApproveIncentive } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { ethMonthName, formatAsEthDate } from "@/lib/ethiopian-calendar";
import { getEffectiveEthDate } from "@/lib/date-override/effective-date";
import Link from "next/link";
import { listPeriods } from "@/lib/incentive/periods";
import { closePeriodAction } from "./actions";
import { Award, Calendar, CheckCircle2, Clock, ChevronRight, FileText, BarChart2 } from "lucide-react";

export default async function IncentivePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  
  const access = getPageAccess(session.user.role, "/incentive");
  if (access === "none") redirect("/dashboard");

  const periods = await listPeriods();
  const eth = await getEffectiveEthDate();
  const canClose = canCloseIncentive(session.user.role);
  const canApprove = canApproveIncentive(session.user.role);

  const approvedCount = periods.filter((p) => p.status === "APPROVED").length;
  const pendingCount = periods.filter((p) => p.status === "PENDING_APPROVAL").length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="erp-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider font-ethiopic">
            <Award size={14} />
            <span>የምርት ማበረታቻና ክፍያ</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
            {am.incentive.title}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-ethiopic flex items-center gap-2">
            <Calendar size={14} className="text-slate-400" />
            <span>ወቅታዊ ወር፦ {ethMonthName(eth.month)} {eth.year} ዓ.ም</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/incentive/summary"
            className="btn-secondary flex items-center gap-2 font-ethiopic"
          >
            <BarChart2 size={15} />
            <span>{am.incentive.monthSummary}</span>
          </Link>

          {canClose && (
            <div className="flex items-center gap-2">
              <form action={closePeriodAction}>
                <input type="hidden" name="ethYear" value={eth.year} />
                <input type="hidden" name="ethMonth" value={eth.month} />
                <input type="hidden" name="periodNumber" value="1" />
                <button
                  type="submit"
                  className="btn-primary text-xs px-3.5 py-2 font-ethiopic bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  {am.incentive.period1} ዝጋ
                </button>
              </form>
              <form action={closePeriodAction}>
                <input type="hidden" name="ethYear" value={eth.year} />
                <input type="hidden" name="ethMonth" value={eth.month} />
                <input type="hidden" name="periodNumber" value="2" />
                <button
                  type="submit"
                  className="btn-primary text-xs px-3.5 py-2 font-ethiopic bg-gradient-to-r from-indigo-600 to-purple-600"
                >
                  {am.incentive.period2} ዝጋ
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">የክፍያ ወቅቶች</p>
            <Calendar size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{periods.length}</p>
        </div>
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">የፀደቁ ክፍያዎች</p>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums">{approvedCount}</p>
        </div>
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">ማረጋገጫ የሚጠብቁ</p>
            <Clock size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 tabular-nums">{pendingCount}</p>
        </div>
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">የክፍያ ቀናት</p>
            <Award size={16} className="text-indigo-600" />
          </div>
          <p className="text-lg font-bold text-indigo-700 font-ethiopic">ቀን 4 እና 19</p>
        </div>
      </div>

      {/* Periods Table */}
      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead>
              <tr>
                <th className="text-right">የክፍያ ወቅት</th>
                <th className="text-right">የስራ ቀናት (ጊዜ)</th>
                <th className="text-center">ተጠቃሚ ሠራተኞች</th>
                <th className="text-center">{am.status}</th>
                <th className="text-center">{am.actions}</th>
              </tr>
            </thead>
            <tbody>
              {periods.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400 py-16 font-ethiopic">
                    <FileText size={36} className="mx-auto mb-2 text-slate-300" />
                    <p>እስካሁን የተዘጋ የኢንሴንቲቭ ወቅት የለም</p>
                  </td>
                </tr>
              ) : (
                periods.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="font-ethiopic font-semibold text-slate-900 text-right py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <span>{ethMonthName(p.ethMonth)} {p.ethYear} ዓ.ም</span>
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-sans font-bold">
                          ቀን {p.paymentDay}
                        </span>
                      </div>
                    </td>
                    <td className="font-ethiopic text-slate-600 text-xs text-right py-3.5">
                      {formatAsEthDate(p.startDate)} → {formatAsEthDate(p.endDate)}
                    </td>
                    <td className="text-center tabular-nums font-bold text-slate-700 py-3.5">
                      {p.lineCount.toLocaleString()} ሠራተኞች
                    </td>
                    <td className="text-center py-3.5">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="text-center py-3.5">
                      <Link
                        href={`/incentive/${p.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 font-ethiopic hover:underline"
                      >
                        <span>{am.incentive.viewDetails}</span>
                        <ChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: "badge-draft",
    PENDING_APPROVAL: "badge-pending",
    APPROVED: "badge-approved",
    LOCKED: "badge-locked",
  };
  const labels: Record<string, string> = {
    DRAFT: am.draft,
    PENDING_APPROVAL: am.incentive.pendingApproval,
    APPROVED: am.incentive.approved,
    LOCKED: am.locked,
  };
  return <span className={map[status] ?? "badge-draft"}>{labels[status] ?? status}</span>;
}
