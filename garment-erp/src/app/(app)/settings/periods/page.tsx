import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import {
  ethMonthName, defaultPeriodBoundaries, formatAsEthDate,
  ethToGregorian,
} from "@/lib/ethiopian-calendar";
import { getEffectiveEthDate } from "@/lib/date-override/effective-date";
import { savePeriodConfig } from "./actions";
import Link from "next/link";
import { Calendar, ArrowLeft, Save, CheckCircle2, Clock, Sparkles } from "lucide-react";

export default async function PeriodsConfigPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "settings:manage");

  const eth  = await getEffectiveEthDate();
  // Show current year + next year
  const years = [eth.year - 1, eth.year, eth.year + 1];
  const months = Array.from({ length: 13 }, (_, i) => i + 1);

  // Load all existing configs
  const configs = await db.periodConfig.findMany({
    orderBy: [{ ethYear: "asc" }, { ethMonth: "asc" }],
  });
  const configMap = new Map(configs.map((c) => [`${c.ethYear}-${c.ethMonth}`, c]));

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
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider font-ethiopic">
          <Calendar size={14} />
          <span>የክፍያ ዑደቶች</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          {am.settings.periodBoundaries}
        </h1>
        <p className="text-slate-500 font-ethiopic text-sm mt-0.5 leading-relaxed">
          የግማሽ ወር ኢንሴንቲቭ የክፍያ ድንበሮች፦
          <span className="font-semibold text-slate-800"> ወቅት 1 (ከቀዳሚው ወር 20 → ቀን 4)</span> &nbsp;·&nbsp;
          <span className="font-semibold text-slate-800"> ወቅት 2 (ቀን 5 → ቀን 19)</span>
          <br />
          ለጳጉሜ ወር ወቅት 1 ከነሐሴ 20 ይጀምራል። የተለየ የፋብሪካ ቀን ካለ እያንዳንዱን ወር እዚህ ማስተካከል ይቻላል።
        </p>
      </div>

      {/* Year Loop */}
      <div className="space-y-8">
        {years.map((year) => (
          <div key={year} className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-3 py-1 rounded-xl text-sm tabular-nums shadow-sm">
                {year} ዓ.ም
              </span>
              {year === eth.year && (
                <span className="badge-verified font-ethiopic text-xs">
                  የአሁኑ ዓመት
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {months.map((month) => {
                const key      = `${year}-${month}`;
                const existing = configMap.get(key);
                const defaults = defaultPeriodBoundaries(year, month);
                const action   = savePeriodConfig.bind(null, year, month, session.user.id);

                // Use saved config or computed defaults
                const p1Start = existing ? existing.period1Start : defaults.p1Start;
                const p1End   = existing ? existing.period1End   : defaults.p1End;
                const p2Start = existing ? existing.period2Start : defaults.p2Start;
                const p2End   = existing ? existing.period2End   : defaults.p2End;

                const isCurrentMonth = year === eth.year && month === eth.month;
                const isPagume = month === 13;

                return (
                  <form
                    key={key}
                    action={action}
                    className={`erp-card p-5 transition-all ${
                      isCurrentMonth
                        ? "border-blue-400/80 ring-2 ring-blue-500/20 bg-blue-50/20"
                        : isPagume
                        ? "bg-amber-50/30 border-amber-200/80"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-900 font-ethiopic text-base">
                          {ethMonthName(month)}
                        </span>
                        {isCurrentMonth && (
                          <span className="badge-verified font-ethiopic text-xs">
                            ወቅታዊ ወር
                          </span>
                        )}
                        {isPagume && (
                          <span className="badge-warning font-ethiopic text-xs">
                            ጳጉሜ (5/6 ቀናት)
                          </span>
                        )}
                        {existing && (
                          <span className="text-xs text-slate-400 font-ethiopic flex items-center gap-1">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>የተስተካከለ</span>
                          </span>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                      >
                        <Save size={13} />
                        <span>{am.save}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <DateField
                        label="ወቅት 1 መጀመሪያ"
                        name="p1Start"
                        defaultValue={toInputDate(p1Start)}
                        note={formatAsEthDate(p1Start)}
                      />
                      <DateField
                        label="ወቅት 1 ማብቂያ (ቀን 4)"
                        name="p1End"
                        defaultValue={toInputDate(p1End)}
                        note={formatAsEthDate(p1End)}
                      />
                      <DateField
                        label="ወቅት 2 መጀመሪያ (ቀን 5)"
                        name="p2Start"
                        defaultValue={toInputDate(p2Start)}
                        note={formatAsEthDate(p2Start)}
                      />
                      <DateField
                        label="ወቅት 2 ማብቂያ (ቀን 19)"
                        name="p2End"
                        defaultValue={toInputDate(p2End)}
                        note={formatAsEthDate(p2End)}
                      />
                    </div>
                  </form>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function toInputDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function DateField({
  label,
  name,
  defaultValue,
  note,
}: {
  label: string;
  name: string;
  defaultValue: string;
  note: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 font-ethiopic mb-1">
        {label}
      </label>
      <input
        type="date"
        name={name}
        defaultValue={defaultValue}
        className="input-field text-xs py-1.5 px-2.5"
      />
      <p className="text-[11px] text-slate-400 font-ethiopic mt-1">
        {note}
      </p>
    </div>
  );
}
