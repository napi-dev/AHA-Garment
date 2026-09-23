import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { generateTelegramCode, updateSetting } from "./actions";

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
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{am.settings.title}</h1>

      {/* App settings */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <h2 className="font-semibold text-gray-700 font-ethiopic">ዋና ቅንብሮች</h2>
        <SettingRow
          label={am.settings.wastageLimit}
          settingKey="wastage_alert_pct"
          current={settingMap["wastage_alert_pct"] ?? "5.0"}
          type="number"
          userId={session.user.id}
        />
        <SettingRow
          label={am.settings.salaryPayDay}
          settingKey="salary_pay_day"
          current={settingMap["salary_pay_day"] ?? "30"}
          type="number"
          userId={session.user.id}
        />
      </section>

      {/* Telegram linking */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-700 font-ethiopic">{am.settings.telegramSetup}</h2>

        {telegramRecipient?.isActive ? (
          <div className="flex items-center gap-3 bg-green-50 rounded-xl p-4">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-medium text-green-800 font-ethiopic">ቴሌግራም ተያይዟል</p>
              <p className="text-sm text-green-600">Chat ID: {telegramRecipient.chatId}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 font-ethiopic">
              ቦቱን ይፈልጉ: <span className="font-mono font-bold">@YourGarmentBot</span>
              <br />ከዚያ ከዚህ ታች ያለውን ኮድ /link ትዕዛዝ ጋር ላኩ።
            </p>

            {pendingCode ? (
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-xs text-blue-500 font-ethiopic mb-2">{am.settings.verificationCode}</p>
                <p className="text-3xl font-mono font-bold text-blue-700 tracking-widest">
                  {pendingCode.key.replace("telegram_link_", "")}
                </p>
                <p className="text-xs text-blue-400 mt-2 font-ethiopic">
                  ቦቱን ይፈልጉ ከዚያ: /link {pendingCode.key.replace("telegram_link_", "")}
                </p>
              </div>
            ) : (
              <form action={generateTelegramCode}>
                <input type="hidden" name="userId" value={session.user.id} />
                <button className="w-full py-3 bg-blue-600 text-white rounded-xl font-ethiopic font-semibold hover:bg-blue-700 transition-colors">
                  {am.settings.linkTelegram}
                </button>
              </form>
            )}
          </div>
        )}
      </section>

      {/* Report delivery status */}
      <ReportJobStatus />
    </div>
  );
}

async function ReportJobStatus() {
  const recent = await db.reportJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (recent.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-700 font-ethiopic">{am.reports.deliveryStatus}</h2>
      </div>
      <table className="w-full text-sm data-table">
        <thead>
          <tr>
            <th>ሪፖርት</th>
            <th>ቀን</th>
            <th>{am.status}</th>
            <th>ሙከራ</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((job) => (
            <tr key={job.id}>
              <td className="font-ethiopic text-xs">{am.reports[job.type as keyof typeof am.reports] ?? job.type}</td>
              <td className="tabular-nums text-xs text-gray-500">{job.periodDate.toISOString().split("T")[0]}</td>
              <td>
                <span className={
                  job.status === "sent"    ? "badge-approved" :
                  job.status === "failed"  ? "text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full" :
                  "badge-pending"
                }>
                  {job.status === "sent" ? am.reports.sent :
                   job.status === "failed" ? am.reports.failed : am.reports.pending}
                </span>
              </td>
              <td className="text-center tabular-nums text-gray-400">{job.retryCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function SettingRow({ label, settingKey, current, type, userId }: {
  label: string; settingKey: string; current: string; type: string; userId: string;
}) {
  const action = updateSetting.bind(null, settingKey, userId);
  return (
    <form action={action} className="flex items-center gap-4">
      <label className="flex-1 text-sm font-medium text-gray-700 font-ethiopic">{label}</label>
      <input
        name="value"
        type={type}
        defaultValue={current}
        step={type === "number" ? "0.1" : undefined}
        className="w-28 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums text-center"
      />
      <button type="submit"
        className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-ethiopic hover:bg-blue-100 transition-colors">
        {am.save}
      </button>
    </form>
  );
}
