import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission, canApproveIncentive } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { ethMonthName, formatAsEthDate } from "@/lib/ethiopian-calendar";
import { approvePeriodAction } from "../actions";
import Link from "next/link";
import Decimal from "decimal.js";
import { Award, ArrowRight, CheckCircle, Calendar, Users, Calculator, AlertTriangle, ShieldCheck, FileText } from "lucide-react";
import { TelegramSendButton } from "@/components/telegram-send-button";

export default async function IncentiveStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "incentive:view");

  const { id } = await params;

  const period = await db.incentivePeriod.findUnique({
    where: { id },
    include: {
      lines: {
        include: {
          employee: { include: { department: true } },
          card: true,
          job: true,
        },
        orderBy: [{ employee: { department: { flowOrder: "asc" } } }, { employee: { serialNumber: "asc" } }],
      },
    },
  });

  if (!period) notFound();

  const canApprove = canApproveIncentive(session.user.role) && period.status === "PENDING_APPROVAL";

  // Compute totals
  let totalCalc = new Decimal(0);
  let totalPay  = new Decimal(0);
  for (const l of period.lines) {
    totalCalc = totalCalc.plus(new Decimal(l.calculated.toString()));
    totalPay  = totalPay.plus(new Decimal(l.payable.toString()));
  }

  const approve = approvePeriodAction.bind(null, id);

  return (
    <div className="space-y-6">
      {/* Top Navigation Link */}
      <div>
        <Link
          href="/incentive"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors font-ethiopic"
        >
          <ArrowRight size={14} className="rotate-180" />
          <span>ወደ ኢንሴንቲቭ ዝርዝር ተመለስ</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="erp-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider font-ethiopic">
            <Award size={14} />
            <span>የምርት ማበረታቻ ዝርዝር ሰሌዳ</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
            {am.incentive.statement} — ቀን {period.paymentDay}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-ethiopic flex items-center gap-2">
            <Calendar size={14} className="text-slate-400" />
            <span>{ethMonthName(period.ethMonth)} {period.ethYear} ዓ.ም</span>
            <span>·</span>
            <span>{formatAsEthDate(period.startDate)} እስከ {formatAsEthDate(period.endDate)}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <StatusChip status={period.status} />

          <Link
            href={`/api/reports/incentive/${id}`}
            target="_blank"
            className="btn-secondary flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 font-ethiopic"
          >
            <FileText size={16} />
            <span>የክፍያ ሪፖርት አውጣ (PDF)</span>
          </Link>

          <TelegramSendButton
            reportUrl={`/api/reports/incentive/${id}`}
            reportTitle={`የኢንሴንቲቭ ክፍያ ሪፖርት — ቀን ${period.paymentDay}`}
            reportDate={`${ethMonthName(period.ethMonth)} ${period.ethYear} ዓ.ም`}
          />

          {canApprove && (
            <form action={approve}>
              <button
                type="submit"
                className="btn-primary flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 font-ethiopic"
              >
                <ShieldCheck size={16} />
                <span>{am.incentive.approveStatement}</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">{am.incentive.payable}</p>
            <Award size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums">
            {totalPay.toNumber().toLocaleString("en-ET", { minimumFractionDigits: 2 })} <span className="text-xs font-normal">ብር</span>
          </p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">{am.incentive.calculated}</p>
            <Calculator size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700 tabular-nums">
            {totalCalc.toNumber().toLocaleString("en-ET", { minimumFractionDigits: 2 })} <span className="text-xs font-normal">ብር</span>
          </p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">ተጠቃሚ ሠራተኞች</p>
            <Users size={16} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">
            {period.lines.length.toLocaleString()}
          </p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">የክፍያ ቀን</p>
            <Calendar size={16} className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-700 font-ethiopic">
            ቀን {period.paymentDay}
          </p>
        </div>
      </div>

      {/* Formula Reminder Card */}
      <div className="erp-card p-3.5 bg-slate-50/60 border-slate-200/60 text-xs text-slate-600 font-ethiopic flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">የስሌት ቀመር፦</span>
          <code className="bg-white px-2.5 py-1 rounded-md border border-slate-200 font-mono text-slate-800 font-semibold">
            {am.incentive.formula}
          </code>
        </div>
        <span className="text-slate-500">※ {am.incentive.payableRule}</span>
      </div>

      {/* Statement Table */}
      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead>
              <tr>
                <th className="w-12 text-center">{am.serialNumber}</th>
                <th className="text-right">{am.employees.name}</th>
                <th className="text-right">{am.employees.department}</th>
                <th className="text-center">{am.incentive.ratePerPiece}</th>
                <th className="text-center">{am.incentive.plusPieces}</th>
                <th className="text-center">{am.incentive.minusPieces}</th>
                <th className="text-center">{am.incentive.mistakes}</th>
                <th className="text-right">{am.incentive.calculated}</th>
                <th className="text-right">{am.incentive.payable}</th>
              </tr>
            </thead>
            <tbody>
              {period.lines.map((line, idx) => {
                const calc = parseFloat(line.calculated.toString());
                const pay  = parseFloat(line.payable.toString());
                return (
                  <tr key={line.id} className={line.isSuspended ? "bg-rose-50/50" : "hover:bg-slate-50/80 transition-colors"}>
                    <td className="text-center tabular-nums text-slate-400 py-3">{idx + 1}</td>
                    <td className="font-ethiopic text-slate-900 font-medium text-right py-3">
                      <div>{line.employee.nameAm}</div>
                      <div className="text-xs font-mono text-slate-400">
                        {line.employee.employeeCode ?? line.employee.serialNumber}
                      </div>
                    </td>
                    <td className="font-ethiopic text-slate-600 text-xs text-right py-3">
                      <div>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                          {line.employee.department.nameAm}
                        </span>
                      </div>
                      {line.job && (
                        <div className="text-blue-600 text-[11px] font-semibold mt-1">
                          {line.job.nameAm}
                        </div>
                      )}
                    </td>
                    <td className="tabular-nums text-center text-slate-600 py-3">
                      {parseFloat(line.ratePerPiece.toString()).toFixed(2)}
                    </td>
                    <td className="tabular-nums text-center text-emerald-700 font-semibold py-3">
                      {line.plusPieces > 0 ? `+${line.plusPieces.toLocaleString()}` : "—"}
                    </td>
                    <td className="tabular-nums text-center text-rose-600 font-semibold py-3">
                      {line.minusPieces > 0 ? `−${line.minusPieces.toLocaleString()}` : "—"}
                    </td>
                    <td className="tabular-nums text-center text-amber-700 font-semibold py-3">
                      {line.mistakes > 0 ? `${line.mistakes.toLocaleString()}` : "—"}
                    </td>
                    <td className={`tabular-nums font-semibold text-right py-3 ${calc < 0 ? "text-rose-600" : "text-slate-700"}`}>
                      {calc.toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="tabular-nums font-bold text-right text-emerald-700 py-3">
                      {line.isSuspended ? (
                        <span className="badge-danger text-xs font-ethiopic">{am.incentive.suspended}</span>
                      ) : (
                        `${pay.toLocaleString("en-ET", { minimumFractionDigits: 2 })} ብር`
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                <td colSpan={7} className="p-4 text-right font-ethiopic text-slate-800 text-base">
                  {am.total} የሚከፈል ጠቅላላ ድምር፦
                </td>
                <td className={`p-4 tabular-nums text-right text-base ${parseFloat(totalCalc.toString()) < 0 ? "text-rose-600" : "text-slate-800"}`}>
                  {totalCalc.toNumber().toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                </td>
                <td className="p-4 tabular-nums text-right text-base text-emerald-700">
                  {totalPay.toNumber().toLocaleString("en-ET", { minimumFractionDigits: 2 })} ብር
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {period.approvedAt && (
          <div className="p-4 border-t border-slate-100 bg-emerald-50/40 text-xs text-emerald-800 font-ethiopic flex items-center gap-2">
            <CheckCircle size={15} className="text-emerald-600" />
            <span>ይህ ሰሌዳ በዋና ሥራ አስኪያጅ ፀድቋል፦ {new Date(period.approvedAt).toLocaleString("en-ET")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
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
  return <span className={`text-xs px-3 py-1 rounded-full ${map[status] ?? "badge-draft"}`}>{labels[status] ?? status}</span>;
}
