import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { generateTelegramCode, updateSetting } from "./actions";
import { Settings, Sliders, Send, Calendar, Award, CheckCircle2, ChevronRight, Save, Clock, AlertTriangle } from "lucide-react";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "settings:manage");

  const settings = await db.appSetting.findMany();
  const settingMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  const telegramRecipient = await db.telegramRecipient.findUnique({
    where: { userId: session.user.id },
  });

  const pendingCode = settings.find((s) =>
    s.key.startsWith("telegram_link_") && s.updatedBy === session.user.id
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Card */}
      <div className="erp-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
          <Settings size={14} />
          <span>የሥርዓቱ አስተዳደር</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          {am.settings.title}
        </h1>
        <p className="text-slate-500 font-ethiopic text-sm mt-0.5">
          የፋብሪካው መደበኛ የብክነት ወሰኖች፣ የክፍያ ቀናት እና አውቶሜሽን ማሳወቂያዎች
        </p>
      </div>

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/settings/incentive-card"
          className="erp-card p-5 hover:border-blue-300 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Award size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 font-ethiopic text-sm">
                {am.settings.incentiveCard}
              </h3>
              <p className="text-xs text-slate-500 font-ethiopic mt-0.5">
                የክፍሎች የሰዓት ዒላማና የፍሬ ተመን
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
        </Link>

        <Link
          href="/settings/periods"
          className="erp-card p-5 hover:border-blue-300 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 font-ethiopic text-sm">
                {am.settings.periodBoundaries}
              </h3>
              <p className="text-xs text-slate-500 font-ethiopic mt-0.5">
                የኢትዮጵያ ወራት ክፍያ ወቅት 1 እና 2
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
        </Link>
      </div>

      {/* Main Parameters */}
      <div className="erp-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Sliders size={18} className="text-blue-600" />
          <h2 className="font-bold text-slate-800 font-ethiopic text-base">
            ዋና የሥራ መለኪያዎች
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          <SettingRow
            label={am.settings.wastageLimit}
            desc="ይህ ወሰን ሲያልፍ ለኃላፊዎች አውቶማቲክ ማስጠንቀቂያ ይላካል"
            settingKey="wastage_alert_pct"
            current={settingMap["wastage_alert_pct"] ?? "5.0"}
            type="number"
            unit="%"
            userId={session.user.id}
          />
          <SettingRow
            label={am.settings.salaryPayDay}
            desc="በየወሩ ደሞዝ የሚሰላበት እና የሚከፈልበት ቀን"
            settingKey="salary_pay_day"
            current={settingMap["salary_pay_day"] ?? "30"}
            type="number"
            unit="ቀን"
            userId={session.user.id}
          />
        </div>
      </div>

      {/* Telegram Linking */}
      <div className="erp-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Send size={18} className="text-sky-500" />
          <h2 className="font-bold text-slate-800 font-ethiopic text-base">
            {am.settings.telegramSetup}
          </h2>
        </div>

        {telegramRecipient?.isActive ? (
          <div className="flex items-center gap-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <p className="font-bold text-emerald-900 font-ethiopic text-sm">
                ቴሌግራም በተሳካ ሁኔታ ተያይዟል
              </p>
              <p className="text-xs text-emerald-700 font-mono mt-0.5">
                የቻት መለያ (Chat ID)፦ {telegramRecipient.chatId}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 font-ethiopic leading-relaxed">
              ዕለታዊ የምርት ሪፖርቶች፣ የብክነትና የዕለት መዝጊያ ማስጠንቀቂያዎች በቀጥታ ወደ ቴሌግራምዎ እንዲደርሱ ቦቱን ያገናኙ።
            </p>

            {pendingCode ? (
              <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-5 text-center space-y-2">
                <p className="text-xs font-semibold text-sky-700 font-ethiopic">
                  {am.settings.verificationCode}
                </p>
                <p className="text-3xl font-mono font-bold text-sky-900 tracking-widest">
                  {pendingCode.key.replace("telegram_link_", "")}
                </p>
                <p className="text-xs text-sky-600 font-ethiopic">
                  ቴሌግራም ላይ ቦቱን ይፈልጉ ከዚያ የሚከተለውን መልዕክት ይላኩለት፦
                  <br />
                  <span className="font-mono font-bold text-sky-900">/link {pendingCode.key.replace("telegram_link_", "")}</span>
                </p>
              </div>
            ) : (
              <form action={generateTelegramCode}>
                <input type="hidden" name="userId" value={session.user.id} />
                <button
                  type="submit"
                  className="btn-primary text-xs py-3 px-5 flex items-center gap-2"
                >
                  <Send size={15} />
                  <span>{am.settings.linkTelegram}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Recent Report Delivery Status */}
      <ReportJobStatus />
    </div>
  );
}

async function ReportJobStatus() {
  const recent = await db.reportJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  if (recent.length === 0) return null;

  return (
    <div className="erp-card overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200/80">
        <h2 className="font-bold text-slate-800 font-ethiopic text-sm flex items-center gap-2">
          <Clock size={16} className="text-slate-400" />
          <span>{am.reports.deliveryStatus} (የቅርብ ጊዜ ሪፖርት መላኪያዎች)</span>
        </h2>
      </div>
      <table className="w-full text-left data-table">
        <thead>
          <tr>
            <th>ሪፖርት</th>
            <th>ቀን</th>
            <th className="text-center">{am.status}</th>
            <th className="text-center">የሙከራ ብዛት</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((job) => (
            <tr key={job.id}>
              <td className="font-ethiopic text-xs font-semibold text-slate-800">
                {am.reports[job.type as keyof typeof am.reports] ?? job.type}
              </td>
              <td className="tabular-nums text-xs text-slate-500">
                {job.periodDate.toISOString().split("T")[0]}
              </td>
              <td className="text-center">
                <span className={
                  job.status === "sent" ? "badge-verified font-ethiopic" :
                  job.status === "failed" ? "badge-danger font-ethiopic" :
                  "badge-draft font-ethiopic"
                }>
                  {job.status === "sent" ? am.reports.sent :
                   job.status === "failed" ? am.reports.failed : am.reports.pending}
                </span>
              </td>
              <td className="text-center tabular-nums text-slate-500 text-xs font-mono">
                {job.retryCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettingRow({
  label,
  desc,
  settingKey,
  current,
  type,
  unit,
  userId,
}: {
  label: string;
  desc?: string;
  settingKey: string;
  current: string;
  type: string;
  unit?: string;
  userId: string;
}) {
  const action = updateSetting.bind(null, settingKey, userId);
  return (
    <form action={action} className="py-4 flex items-center justify-between flex-wrap gap-3">
      <div>
        <label className="text-sm font-semibold text-slate-800 font-ethiopic block">{label}</label>
        {desc && <p className="text-xs text-slate-400 font-ethiopic mt-0.5">{desc}</p>}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            name="value"
            type={type}
            defaultValue={current}
            step={type === "number" ? "0.1" : undefined}
            className="input-field text-xs py-2 px-3 w-28 text-center tabular-nums font-bold"
          />
          {unit && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
              {unit}
            </span>
          )}
        </div>
        <button
          type="submit"
          className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
        >
          <Save size={13} />
          <span>{am.save}</span>
        </button>
      </div>
    </form>
  );
}
