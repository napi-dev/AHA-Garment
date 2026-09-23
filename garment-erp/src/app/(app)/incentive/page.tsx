import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { ethMonthName, todayEth, defaultPeriodBoundaries, ethToGregorian, formatAsEthDate } from "@/lib/ethiopian-calendar";
import Link from "next/link";
import { listPeriods } from "@/lib/incentive/periods";
import { closePeriodAction } from "./actions";

export default async function IncentivePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "incentive:view");

  const periods = await listPeriods();
  const eth = todayEth();
  const canClose = session.user.role === "ADMIN" || session.user.role === "SUPER_MANAGER" || session.user.role === "PRODUCTION_MANAGER";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{am.incentive.title}</h1>
        {canClose && (
          <div className="flex gap-2">
            <form action={closePeriodAction}>
              <input type="hidden" name="ethYear"       value={eth.year} />
              <input type="hidden" name="ethMonth"      value={eth.month} />
              <input type="hidden" name="periodNumber"  value="1" />
              <button className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold font-ethiopic hover:bg-blue-700 transition-colors">
                {am.incentive.period1} ዝጋ
              </button>
            </form>
            <form action={closePeriodAction}>
              <input type="hidden" name="ethYear"       value={eth.year} />
              <input type="hidden" name="ethMonth"      value={eth.month} />
              <input type="hidden" name="periodNumber"  value="2" />
              <button className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold font-ethiopic hover:bg-indigo-700 transition-colors">
                {am.incentive.period2} ዝጋ
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Periods table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm data-table">
          <thead>
            <tr>
              <th>ወቅት</th>
              <th>ጊዜ</th>
              <th>ሠራተኞች</th>
              <th>{am.status}</th>
              <th>{am.actions}</th>
            </tr>
          </thead>
          <tbody>
            {periods.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-gray-400 py-12 font-ethiopic">
                  ምንም ወቅት አልተዘጋም
                </td>
              </tr>
            )}
            {periods.map((p) => (
              <tr key={p.id}>
                <td className="font-ethiopic">
                  {ethMonthName(p.ethMonth)} {p.ethYear} — ቀን {p.paymentDay}
                </td>
                <td className="text-gray-500 text-xs">
                  {formatAsEthDate(p.startDate)} → {formatAsEthDate(p.endDate)}
                </td>
                <td className="text-center tabular-nums">{p.lineCount}</td>
                <td><StatusBadge status={p.status} /></td>
                <td>
                  <Link href={`/incentive/${p.id}`}
                    className="text-xs text-blue-600 hover:underline font-ethiopic">
                    ይመልከቱ
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
