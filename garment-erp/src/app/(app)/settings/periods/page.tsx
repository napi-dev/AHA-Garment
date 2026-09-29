import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import {
  ethMonthName, defaultPeriodBoundaries, formatAsEthDate,
} from "@/lib/ethiopian-calendar";
import { getEffectiveEthDate } from "@/lib/date-override/effective-date";
import { savePeriodConfig } from "./actions";
import Link from "next/link";
import { Calendar, ArrowLeft, Save, CheckCircle2, Plus, Trash2 } from "lucide-react";

const ETH_MONTHS = Array.from({ length: 13 }, (_, i) => i + 1);

export default async function PeriodsConfigPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "settings:manage");

  const eth = await getEffectiveEthDate();

  // Load all existing configs ordered by most recent
  const configs = await db.periodConfig.findMany({
    orderBy: [{ ethYear: "desc" }, { ethMonth: "desc" }],
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Navigation */}
      <Link href="/settings"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 font-ethiopic">
        <ArrowLeft size={14} />
        <span>ወደ ቅንብሮች ተመለስ</span>
      </Link>

      {/* Header */}
      <div className="erp-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider font-ethiopic">
          <Calendar size={14} />
          <span>የክፍያ ወቅቶች ቅንብር</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          {am.settings.periodBoundaries}
        </h1>
        <p className="text-slate-500 font-ethiopic text-sm mt-1 leading-relaxed">
          ለእያንዳንዱ ወር ሁለት ወቅቶች ይፈጠራሉ፦
          <strong className="text-slate-700"> ወቅት 1</strong> (ከቀዳሚው ወር 20 → ቀን 4) ·
          <strong className="text-slate-700"> ወቅት 2</strong> (ቀን 5 → ቀን 19)።
          ሥርዓቱ ራሱ ይሰላል — ልዩ ሁኔታ ካለ ብቻ ከዚህ ያስተካክሉ።
        </p>
      </div>

      {/* Quick Add Form */}
      <QuickAddForm eth={eth} savePeriodConfig={savePeriodConfig} userId={session.user.id} />

      {/* Existing configs list */}
      <div className="erp-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <CheckCircle2 size={15} className="text-emerald-500" />
          <span className="font-semibold text-slate-700 font-ethiopic text-sm">
            የተቀመጡ ወቅቶች ({configs.length})
          </span>
        </div>

        {configs.length === 0 && (
          <div className="p-10 text-center font-ethiopic text-slate-400">
            <Plus size={32} className="mx-auto mb-2 text-slate-300" />
            <p>ምንም የተቀመጠ ወቅት የለም። ሥርዓቱ ካሉ ቀናት ይሰላል።</p>
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {configs.map((cfg) => {
            const action = savePeriodConfig.bind(null, cfg.ethYear, cfg.ethMonth, session.user.id);
            const isCurrentMonth = cfg.ethYear === eth.year && cfg.ethMonth === eth.month;

            return (
              <details key={`${cfg.ethYear}-${cfg.ethMonth}`} className={`group ${isCurrentMonth ? "bg-blue-50/30" : ""}`}>
                <summary className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-50/80 transition-colors list-none">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 font-ethiopic">
                      {ethMonthName(cfg.ethMonth)} {cfg.ethYear} ዓ.ም
                    </span>
                    {isCurrentMonth && (
                      <span className="badge-verified text-xs font-ethiopic">ወቅታዊ</span>
                    )}
                    <span className="text-xs text-slate-400 font-ethiopic hidden sm:inline">
                      ወቅት 1: {formatAsEthDate(cfg.period1Start)} → {formatAsEthDate(cfg.period1End)}
                    </span>
                  </div>
                  <span className="text-xs text-blue-600 font-ethiopic font-semibold group-open:hidden">
                    ያስተካክሉ ›
                  </span>
                </summary>

                <form action={action} className="px-5 pb-5 pt-2 space-y-4 bg-white">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <DateField label="ወቅት 1 መጀመሪያ" name="p1Start"
                      defaultValue={toInputDate(cfg.period1Start)}
                      note={formatAsEthDate(cfg.period1Start)} />
                    <DateField label="ወቅት 1 ማብቂያ" name="p1End"
                      defaultValue={toInputDate(cfg.period1End)}
                      note={formatAsEthDate(cfg.period1End)} />
                    <DateField label="ወቅት 2 መጀመሪያ" name="p2Start"
                      defaultValue={toInputDate(cfg.period2Start)}
                      note={formatAsEthDate(cfg.period2Start)} />
                    <DateField label="ወቅት 2 ማብቂያ" name="p2End"
                      defaultValue={toInputDate(cfg.period2End)}
                      note={formatAsEthDate(cfg.period2End)} />
                  </div>
                  <button type="submit"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors font-ethiopic shadow-sm">
                    <Save size={13} />
                    {am.save}
                  </button>
                </form>
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Quick Add — pick any month/year, auto-fills computed defaults ─────────────

async function QuickAddForm({
  eth, savePeriodConfig, userId,
}: {
  eth: { year: number; month: number; day: number };
  savePeriodConfig: (year: number, month: number, userId: string, fd: FormData) => Promise<void>;
  userId: string;
}) {
  // We pre-compute defaults for the current effective month as the suggestion
  const defaults = defaultPeriodBoundaries(eth.year, eth.month);
  const action = savePeriodConfig.bind(null, eth.year, eth.month, userId);

  return (
    <div className="erp-card p-6 space-y-4 border-blue-100 bg-blue-50/20">
      <div className="flex items-center gap-2">
        <Plus size={16} className="text-blue-600" />
        <h2 className="font-bold text-slate-800 font-ethiopic text-sm">አዲስ ወቅት ቅንብር ጨምር</h2>
      </div>

      <p className="text-xs text-slate-500 font-ethiopic leading-relaxed">
        ከዚህ ወር (
        <strong>{ethMonthName(eth.month)} {eth.year}</strong>
        ) ወቅቶች ቀድሞ ሳይቀመጡ ከሆኑ፣ የካሉ ቀናቶች ቀጥሎ ቀርበዋል። ቀን ቀይረው "አስቀምጥ" ይጫኑ።
        የፈለጉት ወር ቀድሞ ከቀረቡ ከዝርዝሩ ያርሙ።
      </p>

      {/* Month/Year selector — manual entry */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 font-ethiopic mb-1.5">ወር</label>
          <select name="quickMonth" form="quick-add-form"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-ethiopic focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            defaultValue={eth.month}>
            {ETH_MONTHS.map((m) => (
              <option key={m} value={m}>{ethMonthName(m)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 font-ethiopic mb-1.5">ዓ.ም</label>
          <input type="number" name="quickYear" form="quick-add-form"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            defaultValue={eth.year} min={2010} max={2060} />
        </div>
      </div>

      <form id="quick-add-form" action={action} className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <DateField label="ወቅት 1 መጀመሪያ" name="p1Start"
            defaultValue={toInputDate(defaults.p1Start)}
            note={formatAsEthDate(defaults.p1Start)} />
          <DateField label="ወቅት 1 ማብቂያ" name="p1End"
            defaultValue={toInputDate(defaults.p1End)}
            note={formatAsEthDate(defaults.p1End)} />
          <DateField label="ወቅት 2 መጀመሪያ" name="p2Start"
            defaultValue={toInputDate(defaults.p2Start)}
            note={formatAsEthDate(defaults.p2Start)} />
          <DateField label="ወቅት 2 ማብቂያ" name="p2End"
            defaultValue={toInputDate(defaults.p2End)}
            note={formatAsEthDate(defaults.p2End)} />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors font-ethiopic shadow-sm">
            <Save size={14} />
            አስቀምጥ (ወይም አዘምን)
          </button>
          <p className="text-xs text-slate-400 font-ethiopic">
            ቀድሞ የተቀመጠ ወቅት ካለ ይዘምናል — ድጋሚ አይፈጠርም
          </p>
        </div>
      </form>
    </div>
  );
}

function toInputDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function DateField({
  label, name, defaultValue, note,
}: {
  label: string; name: string; defaultValue: string; note: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 font-ethiopic mb-1">{label}</label>
      <input type="date" name={name} defaultValue={defaultValue}
        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
      <p className="text-[11px] text-slate-400 font-ethiopic mt-1">{note}</p>
    </div>
  );
}
