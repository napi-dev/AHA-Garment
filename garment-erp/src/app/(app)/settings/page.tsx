import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { 
  generateTelegramCode, 
  updateSetting, 
  addGarmentType, 
  removeGarmentType, 
  updateAttendanceBonus 
} from "./actions";
import { 
  Settings, Sliders, Send, Award, CheckCircle2, 
  ChevronRight, Save, Clock, Briefcase, Tag, Trash2, Plus, 
  Layers, ShieldAlert 
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "settings:manage");

  const [settings, salarySetting, departments, telegramRecipient] = await Promise.all([
    db.appSetting.findMany(),
    db.salarySetting.findUnique({ where: { id: "default" } }),
    db.department.findMany({
      where: { isActive: true },
      include: {
        jobs: {
          select: { id: true, nameAm: true, isActive: true },
        },
      },
      orderBy: { flowOrder: "asc" },
    }),
    db.telegramRecipient.findUnique({
      where: { userId: session.user.id },
    }),
  ]);

  const settingMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  const pendingCode = settings.find((s) =>
    s.key.startsWith("telegram_link_") && s.updatedBy === session.user.id
  );

  // Garment types
  const defaultTypes = ["ቲ-ሸርት", "ትራክ ሱሪ", "ፖሎ ሸሚዝ", "ጃኬት", "ሆዲ"];
  let savedGarmentTypes: string[] = defaultTypes;
  if (settingMap["garment_types"]) {
    try {
      const parsed = JSON.parse(settingMap["garment_types"]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        savedGarmentTypes = parsed;
      }
    } catch {}
  }

  const totalJobs = departments.reduce((acc, d) => acc + d.jobs.length, 0);
  const activeJobs = departments.reduce(
    (acc, d) => acc + d.jobs.filter((j) => j.isActive).length,
    0
  );

  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-ethiopic">
      {/* Header Card */}
      <div className="erp-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
          <Settings size={16} />
          <span>የሥርዓቱ አስተዳደርና ውቅረት</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">
          {am.settings.title}
        </h1>
        <p className="text-slate-500 text-xs mt-0.5">
          የፋብሪካው መደበኛ የብክነት ወሰኖች፣ የስራ ዓይነቶች፣ የተመን ካርዶች እና አውቶሜሽን ማሳወቂያዎች
        </p>
      </div>

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Jobs Management Card */}
        <Link
          href="/settings/jobs"
          className="erp-card p-5 hover:border-blue-400 hover:shadow-sm transition-all flex items-center justify-between group border-l-4 border-l-blue-600"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Briefcase size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                የስራ ዓይነቶች አስተዳደር (Jobs)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                አዳዲስ ስራዎችን መዝግብ፣ አቦዝን ወይም ሰርዝ ({totalJobs} ስራዎች)
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
        </Link>

        {/* Incentive Card */}
        <Link
          href="/settings/incentive-card"
          className="erp-card p-5 hover:border-emerald-400 hover:shadow-sm transition-all flex items-center justify-between group border-l-4 border-l-emerald-600"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Award size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {am.settings.incentiveCard}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                የእያንዳንዱ ስራ የሰዓት ዒላማና የፍሬ ተመን ማስተካከያ
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
        </Link>
      </div>

      {/* Main Parameters */}
      <div className="erp-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Sliders size={18} className="text-blue-600" />
          <h2 className="font-bold text-slate-800 text-base">
            ዋና የሥራ መለኪያዎች
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {/* Cutting wastage limit */}
          <SettingRow
            label="የቆረጣ ጨርቅ ፍጆታ ወሰን (Cutting Limit)"
            desc="ፍጆታ (ኪ.ግ ÷ ፍሬ) ከዚህ ቁጥር ሲበልጥ ራስ-ሰር ማስጠንቀቂያ ይላካል (መደበኛ፦ 1.00)"
            settingKey="cutting_wastage_limit"
            current={settingMap["cutting_wastage_limit"] ?? "1.00"}
            type="number"
            unit="ኪ.ግ/ፍሬ"
            userId={session.user.id}
          />

          {/* Monthly Attendance Bonus */}
          <div className="py-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-800 block">
                የወርሃዊ መገኘት ቦነስ (Attendance Bonus)
              </label>
              <p className="text-xs text-slate-400 mt-0.5">
                በወሩ ሙሉ የስራ ቀናት የተገኙ ሠራተኞች የሚያገኙት ተጨማሪ ቦነስ (ከቀጣዩ ወር ጀምሮ ይጸናል)
              </p>
            </div>
            {isAdmin ? (
              <form action={updateAttendanceBonus} className="flex items-center gap-2">
                <div className="relative">
                  <input
                    name="bonus"
                    type="number"
                    step="50"
                    min="0"
                    defaultValue={salarySetting ? parseFloat(salarySetting.attendanceBonus.toString()) : 500}
                    className="input-field text-xs py-2 px-3 w-28 text-center tabular-nums font-bold"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    ብር
                  </span>
                </div>
                <button
                  type="submit"
                  className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                >
                  <Save size={13} />
                  <span>{am.save}</span>
                </button>
              </form>
            ) : (
              <div className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border">
                {salarySetting ? parseFloat(salarySetting.attendanceBonus.toString()) : 500} ብር (ባለቤት ብቻ)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Garment Types List Manager */}
      <div className="erp-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag size={18} className="text-indigo-600" />
            <h2 className="font-bold text-slate-800 text-base">
              የትዕዛዝ ልብስ ዓይነቶች (Garment Types)
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            {savedGarmentTypes.length} ዓይነቶች ተመዝግበዋል
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          በአዲስ ትዕዛዝ መስጫ ገጽ ላይ የሚታዩ የልብስ ዓይነቶች። አዲስ ዓይነት እዚህ መጨመር ወይም ትዕዛዝ ሲመዘገብ "ሌላ" በመምረጥ በራስ-ሰር እንዲመዘገብ ማድረግ ይችላሉ።
        </p>

        {/* Tags list */}
        <div className="flex flex-wrap gap-2 pt-1">
          {savedGarmentTypes.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs font-medium"
            >
              <span>{t}</span>
              {!defaultTypes.includes(t) && (
                <form action={removeGarmentType.bind(null, t)} className="inline">
                  <button
                    type="submit"
                    title="አስወግድ"
                    className="text-slate-400 hover:text-rose-600 transition-colors ml-0.5"
                  >
                    ×
                  </button>
                </form>
              )}
            </span>
          ))}
        </div>

        {/* Add new type form */}
        <form action={addGarmentType} className="pt-2 flex items-center gap-2 max-w-sm">
          <input
            name="typeName"
            placeholder="አዲስ የልብስ ዓይነት ስም (ምሳሌ፦ ጋዋን)"
            required
            className="input-field text-xs py-2 px-3 flex-1"
          />
          <button
            type="submit"
            className="btn-primary text-xs py-2 px-3 flex items-center gap-1 shadow-sm whitespace-nowrap"
          >
            <Plus size={14} />
            <span>አክል</span>
          </button>
        </form>
      </div>

      {/* Jobs Overview by Department */}
      <div className="erp-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-blue-600" />
            <h2 className="font-bold text-slate-800 text-base">
              የስራ ክፍሎችና ስራዎች ማጠቃለያ ({totalJobs} ስራዎች)
            </h2>
          </div>
          <Link
            href="/settings/jobs"
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
          >
            <span>ሙሉ ዝርዝሩንና አዳዲስ ስራዎችን አስተዳድር</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3 space-y-1.5 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">
                  {dept.nameAm}
                </span>
                <span className="text-[11px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold">
                  {dept.jobs.length} ስራዎች
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {dept.jobs.slice(0, 3).map((j) => (
                  <span
                    key={j.id}
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      j.isActive
                        ? "bg-white text-slate-700 border-slate-200"
                        : "bg-slate-100 text-slate-400 border-slate-200 line-through"
                    }`}
                  >
                    {j.nameAm}
                  </span>
                ))}
                {dept.jobs.length > 3 && (
                  <span className="text-[10px] text-slate-400 px-1">
                    +{dept.jobs.length - 3} ሌላ
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Telegram Linking */}
      <div className="erp-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Send size={18} className="text-sky-500" />
          <h2 className="font-bold text-slate-800 text-base">
            {am.settings.telegramSetup}
          </h2>
        </div>

        {telegramRecipient?.isActive ? (
          <div className="flex items-center gap-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <p className="font-bold text-emerald-900 text-sm">
                ቴሌግራም በተሳካ ሁኔታ ተያይዟል
              </p>
              <p className="text-xs text-emerald-700 font-mono mt-0.5">
                የቻት መለያ (Chat ID)፦ {telegramRecipient.chatId}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              ዕለታዊ የምርት ሪፖርቶች፣ የብክነትና የዕለት መዝጊያ ማስጠንቀቂያዎች በቀጥታ ወደ ቴሌግራምዎ እንዲደርሱ ቦቱን ያገናኙ።
            </p>

            {pendingCode ? (
              <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-5 text-center space-y-2">
                <p className="text-xs font-semibold text-sky-700">
                  {am.settings.verificationCode}
                </p>
                <p className="text-3xl font-mono font-bold text-sky-900 tracking-widest">
                  {pendingCode.key.replace("telegram_link_", "")}
                </p>
                <p className="text-xs text-sky-600">
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
        <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
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
              <td className="text-xs font-semibold text-slate-800">
                {am.reports[job.type as keyof typeof am.reports] ?? job.type}
              </td>
              <td className="tabular-nums text-xs text-slate-500">
                {job.periodDate.toISOString().split("T")[0]}
              </td>
              <td className="text-center">
                <span className={
                  job.status === "sent" ? "badge-verified" :
                  job.status === "failed" ? "badge-danger" :
                  "badge-draft"
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
        <label className="text-sm font-semibold text-slate-800 block">{label}</label>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            name="value"
            type={type}
            defaultValue={current}
            step={type === "number" ? "0.01" : undefined}
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
