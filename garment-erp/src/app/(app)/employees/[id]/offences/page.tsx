import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import { recordOffence, liftSuspension } from "./actions";

export default async function OffencesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "incentive:adjust");

  const { id } = await params;
  const emp = await db.employee.findUnique({
    where: { id },
    include: {
      department: true,
      offences: { orderBy: { date: "desc" } },
      suspensions: { orderBy: { startDate: "desc" } },
    },
  });
  if (!emp) notFound();

  const activeSuspension = emp.suspensions.find((s) => s.isActive);
  const offenceCount = emp.offences.length;

  // Determine next offence level
  const nextLevel =
    offenceCount === 0 ? "FIRST" :
    offenceCount === 1 ? "SECOND" :
    offenceCount === 2 ? "THIRD"  : "FOURTH";

  const today = new Date().toISOString().split("T")[0];

  const recordAction  = recordOffence.bind(null, id);
  const liftAction    = activeSuspension ? liftSuspension.bind(null, activeSuspension.id) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-sm text-gray-500 font-ethiopic mb-1">
          <a href="/employees" className="hover:underline">ሠራተኞች</a> /
          <a href={`/employees/${id}/edit`} className="hover:underline mx-1">{emp.nameAm}</a> /
        </p>
        <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{am.offences.title}</h1>
        <p className="text-gray-500 text-sm mt-0.5 font-ethiopic">{emp.nameAm} — {emp.department.nameAm}</p>
      </div>

      {/* Active suspension banner */}
      {activeSuspension && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-red-800 font-ethiopic">⛔ ኢንሴንቲቭ ታግዷል</p>
            <p className="text-sm text-red-600 font-ethiopic mt-1">
              {formatAsEthDate(activeSuspension.startDate)} → {formatAsEthDate(activeSuspension.endDate)}
            </p>
            <p className="text-xs text-red-500 mt-1">{activeSuspension.reason}</p>
          </div>
          {liftAction && (
            <form action={liftAction}>
              <button className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-ethiopic hover:bg-red-200 transition-colors whitespace-nowrap">
                ታገድ አንሳ
              </button>
            </form>
          )}
        </div>
      )}

      {/* Penalty ladder visual */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
        <h2 className="font-semibold text-gray-700 font-ethiopic">{am.offences.title}</h2>
        {(["FIRST","SECOND","THIRD","FOURTH"] as const).map((level, idx) => {
          const past   = offenceCount > idx;
          const active = !past && nextLevel === level;
          return (
            <div key={level} className={`flex items-start gap-3 p-3 rounded-xl text-sm
              ${past   ? "bg-red-50 border border-red-100"  : ""}
              ${active ? "bg-amber-50 border border-amber-200 font-medium" : ""}
              ${!past && !active ? "text-gray-400" : ""}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                ${past   ? "bg-red-500 text-white"    : ""}
                ${active ? "bg-amber-500 text-white"  : ""}
                ${!past && !active ? "bg-gray-100 text-gray-400" : ""}`}>
                {idx + 1}
              </span>
              <p className="font-ethiopic leading-snug">{am.offences[level]}</p>
            </div>
          );
        })}
      </div>

      {/* Record new offence */}
      <form action={recordAction} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <h2 className="font-semibold text-gray-700 font-ethiopic">{am.offences.recordOffence}</h2>
        <input type="hidden" name="level" value={nextLevel} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">
            {am.offences.offenceDate}
          </label>
          <input type="date" name="date" defaultValue={today} required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">
            {am.offences.offenceReason} <span className="text-red-500">*</span>
          </label>
          <textarea name="reason" required rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-ethiopic resize-none"
            placeholder="ምክንያቱን ይጻፉ..." />
        </div>

        <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
          <span className="text-amber-600 text-lg">⚠️</span>
          <p className="text-sm text-amber-700 font-ethiopic">
            {am.offences[nextLevel]}
          </p>
        </div>

        <button type="submit"
          className="w-full py-3 bg-red-600 text-white rounded-xl font-ethiopic font-semibold hover:bg-red-700 transition-colors">
          {am.offences.recordOffence}
        </button>
      </form>

      {/* Offence history */}
      {emp.offences.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700 font-ethiopic">ታሪክ</h2>
          </div>
          <table className="w-full text-sm data-table">
            <thead>
              <tr>
                <th>{am.offences.offenceLevel}</th>
                <th>{am.offences.offenceDate}</th>
                <th>{am.offences.offenceReason}</th>
              </tr>
            </thead>
            <tbody>
              {emp.offences.map((o) => (
                <tr key={o.id}>
                  <td className="font-ethiopic text-xs">
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      {o.level === "FIRST" ? "1ኛ" : o.level === "SECOND" ? "2ኛ" : o.level === "THIRD" ? "3ኛ" : "4ኛ"}
                    </span>
                  </td>
                  <td className="font-ethiopic">{formatAsEthDate(o.date)}</td>
                  <td className="font-ethiopic text-gray-600">{o.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
