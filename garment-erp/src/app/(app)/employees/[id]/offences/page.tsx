import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate, todayISOStringEAT } from "@/lib/ethiopian-calendar";
import { recordOffence, liftSuspension } from "./actions";
import Link from "next/link";
import { ShieldAlert, ArrowRight, AlertTriangle, CheckCircle, Ban, History, ShieldX } from "lucide-react";

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

  const nextLevel =
    offenceCount === 0 ? "FIRST" :
    offenceCount === 1 ? "SECOND" :
    offenceCount === 2 ? "THIRD"  : "FOURTH";

  const today = todayISOStringEAT();

  const recordAction  = recordOffence.bind(null, id);
  const liftAction    = activeSuspension ? liftSuspension.bind(null, activeSuspension.id) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Navigation Link */}
      <div>
        <Link
          href={`/employees/${id}/edit`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors font-ethiopic"
        >
          <ArrowRight size={14} className="rotate-180" />
          <span>ወደ ሠራተኛው መረጃ ተመለስ</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="erp-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 uppercase tracking-wider font-ethiopic">
          <ShieldAlert size={14} />
          <span>የዲሲፕሊንና ጥፋት ቁጥጥር</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          {am.offences.title}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5 font-ethiopic flex items-center gap-2">
          <span className="font-semibold text-slate-800">{emp.nameAm}</span>
          <span>·</span>
          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
            {emp.employeeCode ?? emp.serialNumber}
          </span>
          <span>·</span>
          <span>{emp.department.nameAm}</span>
        </p>
      </div>

      {/* Active suspension banner */}
      {activeSuspension && (
        <div className="alert-error flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Ban size={20} className="text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-900 font-ethiopic">⛔ የኢንሴንቲቭ ክፍያ ታግዷል</p>
              <p className="text-xs text-rose-700 font-ethiopic mt-1">
                የዕገዳ ጊዜ፦ {formatAsEthDate(activeSuspension.startDate)} እስከ {formatAsEthDate(activeSuspension.endDate)}
              </p>
              <p className="text-xs text-rose-600 mt-1 font-ethiopic">ምክንያት፦ {activeSuspension.reason}</p>
            </div>
          </div>
          {liftAction && (
            <form action={liftAction}>
              <button className="btn-secondary text-xs px-3 py-1.5 border-rose-300 text-rose-700 hover:bg-rose-100 font-ethiopic">
                ዕገዳውን አንሳ
              </button>
            </form>
          )}
        </div>
      )}

      {/* Penalty Ladder Visual Card */}
      <div className="erp-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-sm font-ethiopic">
            የፋብሪካው የዲሲፕሊን ቅጣት ደረጃዎች (Penalty Ladder)
          </h2>
          <span className="text-xs text-slate-500 font-ethiopic font-semibold">
            የተመዘገቡ ጥፋቶች፦ {offenceCount}
          </span>
        </div>

        <div className="space-y-2.5">
          {(["FIRST", "SECOND", "THIRD", "FOURTH"] as const).map((level, idx) => {
            const past   = offenceCount > idx;
            const active = !past && nextLevel === level;
            return (
              <div
                key={level}
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-sm transition-all
                  ${past   ? "bg-rose-50/60 border-rose-200 text-rose-900"  : ""}
                  ${active ? "bg-amber-50/80 border-amber-300 font-medium text-amber-900 shadow-sm" : ""}
                  ${!past && !active ? "border-slate-100 text-slate-400 bg-slate-50/40" : ""}`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5
                    ${past   ? "bg-rose-600 text-white"    : ""}
                    ${active ? "bg-amber-500 text-white"  : ""}
                    ${!past && !active ? "bg-slate-200 text-slate-500" : ""}`}
                >
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="font-ethiopic leading-snug">{am.offences[level]}</p>
                  {active && (
                    <span className="inline-block mt-1 text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded font-ethiopic">
                      ቀጣይ እርምጃ
                    </span>
                  )}
                  {past && (
                    <span className="inline-block mt-1 text-[11px] font-semibold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded font-ethiopic">
                      የተፈጸመ
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Record new offence form */}
      <form action={recordAction} className="erp-card p-6 md:p-8 space-y-5">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800 font-ethiopic">
          <ShieldX size={16} className="text-rose-600" />
          <span>{am.offences.recordOffence}</span>
        </div>
        <input type="hidden" name="level" value={nextLevel} />

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.offences.offenceDate} <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            name="date"
            defaultValue={today}
            required
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.offences.offenceReason} <span className="text-rose-500">*</span>
          </label>
          <textarea
            name="reason"
            required
            rows={3}
            className="input-field resize-none font-ethiopic"
            placeholder="የተፈጸመውን ጥፋት ዝርዝር ምክንያት እዚህ ይጻፉ..."
          />
        </div>

        <div className="alert-warning font-ethiopic text-xs flex items-center gap-2.5">
          <AlertTriangle size={16} className="text-amber-700 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-900">ይህ ምዝገባ የሚከተለውን እርምጃ ይተገብራል፦</p>
            <p className="text-amber-800 mt-0.5">{am.offences[nextLevel]}</p>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-rose-600 text-white rounded-xl font-ethiopic font-semibold hover:bg-rose-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <ShieldAlert size={16} />
          <span>{am.offences.recordOffence}</span>
        </button>
      </form>

      {/* Offence history table */}
      {emp.offences.length > 0 && (
        <div className="erp-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <History size={16} className="text-slate-500" />
            <h2 className="font-bold text-slate-800 text-sm font-ethiopic">
              የተመዘገቡ የቀደሙ ጥፋቶች ታሪክ
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm data-table">
              <thead>
                <tr>
                  <th className="w-20 text-center">{am.offences.offenceLevel}</th>
                  <th className="text-right">{am.offences.offenceDate}</th>
                  <th className="text-right">{am.offences.offenceReason}</th>
                </tr>
              </thead>
              <tbody>
                {emp.offences.map((o) => (
                  <tr key={o.id}>
                    <td className="text-center">
                      <span className="badge-danger font-ethiopic">
                        {o.level === "FIRST" ? "1ኛ" : o.level === "SECOND" ? "2ኛ" : o.level === "THIRD" ? "3ኛ" : "4ኛ"}
                      </span>
                    </td>
                    <td className="font-ethiopic text-slate-700 text-right">
                      {formatAsEthDate(o.date)}
                    </td>
                    <td className="font-ethiopic text-slate-600 text-right">
                      {o.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
