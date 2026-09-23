/**
 * Telegram delivery module.
 *
 * Three destinations (set in .env.local):
 *   TELEGRAM_MANAGER_CHAT_ID  — Super Manager + Admin (salary, incentive, all files)
 *   TELEGRAM_DEPT_GROUP_CHAT_ID — Department managers (summary + alerts only, no salary)
 *   TELEGRAM_DEV_CHAT_ID      — Developer (system errors + job failures)
 *
 * Rules:
 *  - Salary and incentive files → manager chat only.
 *  - Daily summary → all three chats.
 *  - Each recipient must have linked their Telegram via one-time code (TelegramRecipient table).
 *  - Bot ignores every chat it hasn't been explicitly configured for.
 *  - Ethiopic characters → sent as files/captions, never monospace tables.
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const BASE_URL  = `https://api.telegram.org/bot${BOT_TOKEN}`;

export interface TelegramSendResult {
  ok: boolean;
  messageId?: number;
  error?: string;
}

/** Send a plain text message (short summary, alert). */
export async function sendMessage(
  chatId: string,
  text: string
): Promise<TelegramSendResult> {
  if (!BOT_TOKEN) return { ok: false, error: "TELEGRAM_BOT_TOKEN not set" };

  try {
    const res = await fetch(`${BASE_URL}/sendMessage`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    const data = await res.json();
    return data.ok
      ? { ok: true, messageId: data.result?.message_id }
      : { ok: false, error: data.description ?? "Telegram error" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Send a PDF or Excel file with a caption. */
export async function sendDocument(
  chatId: string,
  filename: string,
  buffer: Buffer,
  caption: string
): Promise<TelegramSendResult> {
  if (!BOT_TOKEN) return { ok: false, error: "TELEGRAM_BOT_TOKEN not set" };

  try {
    const form = new FormData();
    form.append("chat_id",  chatId);
    form.append("caption",  caption.slice(0, 1024)); // Telegram caption limit
    form.append("document", new Blob([buffer]), filename);

    const res  = await fetch(`${BASE_URL}/sendDocument`, { method: "POST", body: form });
    const data = await res.json();
    return data.ok
      ? { ok: true, messageId: data.result?.message_id }
      : { ok: false, error: data.description ?? "Telegram error" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Chat IDs from env (typed for clarity). */
export const CHATS = {
  manager: process.env.TELEGRAM_MANAGER_CHAT_ID ?? "",
  dept:    process.env.TELEGRAM_DEPT_GROUP_CHAT_ID ?? "",
  dev:     process.env.TELEGRAM_DEV_CHAT_ID ?? "",
} as const;

/** Notify the dev chat on job failure. */
export async function notifyDevError(jobType: string, error: string) {
  if (!CHATS.dev) return;
  await sendMessage(
    CHATS.dev,
    `❌ <b>Job failed</b>: ${jobType}\n<code>${error.slice(0, 300)}</code>`
  );
}

/**
 * Amharic message templates from the master plan (chapter 8).
 * Placeholders are filled by the caller.
 */
export const TEMPLATES = {
  wastageAlert: (order: string, style: string, kg: string, pcs: string, pct: string, name: string) =>
    `⚠️ የብክነት ማስጠንቀቂያ\nትዕዛዝ: ${order}  ስታይል: ${style}\nየወጣ ጨርቅ: ${kg} ኪ.ግ | የተቆረጠ: ${pcs} ፍሬ\nብክነት: ${pct}% (የተፈቀደ: 5%)\nየቆረጣ ኃላፊ: ${name}`,

  lowStockAlert: (material: string, sku: string, qty: string, unit: string, min: string) =>
    `📦 የክምችት ማስጠንቀቂያ\n${material} (${sku}) ክምችት ከዝቅተኛ ወሰን በታች ነው።\nያለ: ${qty} ${unit} | ዝቅተኛ ወሰን: ${min} ${unit}`,

  dailySummary: (
    date: string, cut: string, wastePct: string,
    sewn: string, qcPassed: string, qcFailed: string,
    packed: string, shipped: string,
    aboveTarget: number, total: number, alerts: number
  ) =>
    `📊 የዕለት ማጠቃለያ — ${date}\n` +
    `✂️ የተቆረጠ: ${cut} ፍሬ | ብክነት: ${wastePct}%\n` +
    `🧵 የተሰፋ: ${sewn} ፍሬ\n` +
    `✅ ጥራት ያለፈ: ${qcPassed} | ❌ የተመለሰ: ${qcFailed}\n` +
    `📦 የታሸገ: ${packed} | 🚚 የተላከ: ${shipped}\n` +
    `🏆 ከዒላማ በላይ የሰሩ ሰራተኞች: ${aboveTarget} ከ ${total}\n` +
    `⚠️ ማስጠንቀቂያዎች: ${alerts}`,

  incentiveReady: (period: string, calc: string, pay: string) =>
    `💰 ኢንሴንቲቭ መግለጫ ዝግጁ ነው — ${period}\nየተሰላ: ${calc} ብር | ሊከፈል: ${pay} ብር\nለማፅደቅ ሥርዓቱን ይከፍቱ።`,
} as const;
