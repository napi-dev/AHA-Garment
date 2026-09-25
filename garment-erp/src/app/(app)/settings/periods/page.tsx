import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import {
  ethMonthName, defaultPeriodBoundaries, formatAsEthDate,
  todayEth, ethToGregorian,
} from "@/lib/ethiopian-calendar";
import { savePeriodConfig } from "./actions";

export default async function PeriodsConfigPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "settings:manage");

  const eth  = todayEth();
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
      <div>
        <p className="text-sm text-gray-500 mb-1">
          <a href="/settings" className="hover:underline font-ethiopic">ቅንብሮች</a> /
        </p>
        <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">የወቅት ድንበሮች</h1>
        <p className="text-gray-500 text-sm mt-1 font-ethiopic max-w-2xl">
          ወቅት 1: ከቀዳሚ ወር 20 → ቀን 4 &nbsp;·&nbsp; ወቅት 2: ቀን 5 → ቀን 19
          <br />
          ለጳጉሜ ወር (ቀዳሚ ወር) ወቅት 1 ዶ ከነሐሴ 20 ይጀምራል። ከዚህ ካለ ወሰን ጠረጴዛ ውስጥ ልዩ ቀናት ያስቀምጡ።
        </p>
      </div>

      <div className="space-y-8">
        {years.map((year) => (
          <div key={year}>
            <h2 className="font-semibold text-gray-700 font-ethiopic mb-4 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm tabular-nums">
                {year} ዓ.ም
              </span>
            </h2>
            <div className="grid gap-3">
              {months.map((month) => {
                const key     = `${year}-${month}`;
                const existing = configMap.get(key);
                const defaults  = defaultPeriodBoundaries(year, month);
                const action    = savePeriodConfig.bind(null, year, month, session.user.id);

                // Use saved config or computed defaults
                const p1Start = existing ? existing.period1Start : defaults.p1Start;
                const p1End   = existing ? existing.period1End   : defaults.p1End;
                const p2Start = existing ? existing.period2Start : defaults.p2Start;
                const p2End   = existing ? existing.period2End   : defaults.p2End;

                const isCurrentMonth = year === eth.year && month === eth.month;
                const isPagume = month === 13;

                return (
                  <form key={key} action={action}
                    className={`bg-white rounded-2xl shadow-sm border p-5 ${isCurrentMonth ? "border-blue-300 ring-1 ring-blue-200" : "border-gray-100"} ${isPagume ? "bg-amber-50/30" : ""}`}>
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800 font-ethiopic">
                          {ethMonthName(month)}
                        </span>
                        {isCurrentMonth && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-ethiopic">አሁን</span>
                        )}
                        {isPagume && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-ethiopic">ጳጉሜ</span>
                        )}
                        {existing && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-ethiopic">ተቀምጧል</span>
                        )}
                      </div>
                      <button type="submit"
                        className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-ethiopic hover:bg-blue-700 transition-colors">
                        {am.save}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <DateField
                        label="ወቅት 1 ጀምር"
                        name="p1Start"
                        defaultValue={toInputDate(p1Start)}
                        note={formatAsEthDate(p1Start)}
                      />
                      <DateField
                        label="ወቅት 1 ጨርስ (ቀን 4)"
                        name="p1End"
                        defaultValue={toInputDate(p1End)}
                        note={formatAsEthDate(p1End)}
                      />
                      <DateField
                        label="ወቅት 2 ጀምር (ቀን 5)"
                        name="p2Start"
                        defaultValue={toInputDate(p2Start)}
                        note={formatAsEthDate(p2Start)}
                      />
                      <DateField
                        label="ወቅት 2 ጨርስ (ቀን 19)"
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

function DateField({ label, name, defaultValue, note }: {
  label: string; name: string; defaultValue: string; note: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 font-ethiopic mb-1">{label}</label>
      <input type="date" name={name} defaultValue={defaultValue}
        className="w-full px-2 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
      <p className="text-[10px] text-gray-400 font-ethiopic mt-0.5">{note}</p>
    </div>
  );
}
