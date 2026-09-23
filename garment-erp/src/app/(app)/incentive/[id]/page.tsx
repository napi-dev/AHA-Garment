import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission, canApproveIncentive } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { ethMonthName, formatAsEthDate } from "@/lib/ethiopian-calendar";
import { approvePeriodAction } from "../actions";
import Link from "next/link";
import Decimal from "decimal.js";

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
        },
        orderBy: [{ employee: { department: { sortOrder: "asc" } } }, { employee: { serialNumber: "asc" } }],
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-gray-500 font-ethiopic mb-1">
            <Link href="/incentive" className="hover:underline">ኢንሴንቲቭ</Link> /
          </p>
          <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">
            {am.incentive.statement} — ቀን {period.paymentDay}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5 font-ethiopic">
            {ethMonthName(period.ethMonth)} {period.ethYear} ዓ.ም
            <span className="mx-2">·</span>
            {formatAsEthDate(period.startDate)} → {formatAsEthDate(period.endDate)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusChip status={period.status} />
          {canApprove && (
            <form action={approve}>
              <button className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold font-ethiopic hover:bg-emerald-700 transition-colors">
                {am.incentive.approveStatement}
              </button>
            </form>
          )}
          <Link href={`/incentive/${id}/pdf`}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-ethiopic hover:bg-gray-200 transition-colors">
            PDF
          </Link>
        </div>
      </div>

      {/* Totals bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SumCard label={am.incentive.calculated} value={totalCalc.toFixed(2)} color="text-blue-700" />
        <SumCard label={am.incentive.payable}    value={totalPay.toFixed(2)}  color="text-emerald-700" />
        <SumCard label="ሠራተኞች" value={String(period.lines.length)} />
        <SumCard label="ወቅት" value={`ቀን ${period.paymentDay}`} />
      </div>

      {/* Formula reminder */}
      <p className="text-xs text-gray-400 font-ethiopic bg-gray-50 rounded-lg px-4 py-2">
        {am.incentive.formula} &nbsp;·&nbsp; {am.incentive.payableRule}
      </p>

      {/* Statement table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm data-table">
          <thead>
            <tr>
              <th className="w-10">{am.serialNumber}</th>
              <th>{am.employees.name}</th>
              <th>{am.employees.department}</th>
              <th>{am.incentive.ratePerPiece}</th>
              <th>{am.incentive.plusPieces}</th>
              <th>{am.incentive.minusPieces}</th>
              <th>{am.incentive.mistakes}</th>
              <th>{am.incentive.calculated}</th>
              <th>{am.incentive.payable}</th>
              <th className="w-20">{am.signature}</th>
            </tr>
          </thead>
          <tbody>
            {period.lines.map((line, idx) => {
              const calc = parseFloat(line.calculated.toString());
              const pay  = parseFloat(line.payable.toString());
              return (
                <tr key={line.id} className={line.isSuspended ? "bg-red-50/40" : ""}>
                  <td className="text-center tabular-nums text-gray-400">{idx + 1}</td>
                  <td className="font-ethiopic text-gray-800">{line.employee.nameAm}</td>
                  <td className="font-ethiopic text-gray-600 text-xs">{line.employee.department.nameAm}</td>
                  <td className="tabular-nums text-center">{parseFloat(line.ratePerPiece.toString()).toFixed(2)}</td>
                  <td className="tabular-nums text-center text-green-700 font-medium">
                    {line.plusPieces > 0 ? `+${line.plusPieces}` : "—"}
                  </td>
                  <td className="tabular-nums text-center text-red-600 font-medium">
                    {line.minusPieces > 0 ? `−${line.minusPieces}` : "—"}
                  </td>
                  <td className="tabular-nums text-center text-orange-700">
                    {line.mistakes > 0 ? line.mistakes : "—"}
                  </td>
                  <td className={`tabular-nums font-medium ${calc < 0 ? "text-red-600" : "text-gray-800"}`}>
                    {calc.toFixed(2)}
                  </td>
                  <td className={`tabular-nums font-semibold ${pay > 0 ? "text-emerald-700" : "text-gray-400"}`}>
                    {line.isSuspended ? (
                      <span className="text-red-500 font-ethiopic text-xs">{am.incentive.suspended}</span>
                    ) : pay.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-bold text-base">
              <td colSpan={7} className="p-3 text-right font-ethiopic text-gray-700">{am.total}</td>
              <td className={`p-3 tabular-nums ${parseFloat(totalCalc.toString()) < 0 ? "text-red-600" : "text-gray-900"}`}>
                {totalCalc.toFixed(2)}
              </td>
              <td className="p-3 tabular-nums text-emerald-700">{totalPay.toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {period.approvedAt && (
        <p className="text-xs text-gray-400 font-ethiopic">
          ፀድቋል: {new Date(period.approvedAt).toLocaleString("en-ET")}
        </p>
      )}
    </div>
  );
}

function SumCard({ label, value, color = "text-gray-800" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-500 font-ethiopic mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: "badge-draft", PENDING_APPROVAL: "badge-pending",
    APPROVED: "badge-approved", LOCKED: "badge-locked",
  };
  const labels: Record<string, string> = {
    DRAFT: am.draft, PENDING_APPROVAL: am.incentive.pendingApproval,
    APPROVED: am.incentive.approved, LOCKED: am.locked,
  };
  return <span className={`text-sm px-3 py-1 rounded-full ${map[status] ?? "badge-draft"}`}>{labels[status] ?? status}</span>;
}
