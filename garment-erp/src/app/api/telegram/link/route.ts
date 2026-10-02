/**
 * GET  /api/telegram/link?code=XXXX
 * Verifies a one-time code and stores the chat_id from the Update object.
 *
 * Flow:
 *  1. User opens Settings → Telegram → a one-time 8-char code is shown.
 *  2. User sends /link XXXX to the bot.
 *  3. Bot webhook POSTs to /api/telegram/webhook, which calls this verify logic.
 *
 * POST /api/telegram/webhook  — receives Telegram updates.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMessage } from "@/lib/automation/telegram";

export const dynamic = "force-dynamic";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";

export async function POST(req: NextRequest) {
  // Validate webhook secret (Telegram sends X-Telegram-Bot-Api-Secret-Token)
  const secret = req.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
  if (secret !== (process.env.TELEGRAM_WEBHOOK_SECRET ?? "")) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const body = await req.json();
  const msg  = body?.message;
  if (!msg) return NextResponse.json({ ok: true });

  const text   = String(msg.text ?? "").trim();
  const chatId = String(msg.chat?.id ?? "");

  // /link CODE
  const match = text.match(/^\/link\s+([A-Z0-9]{8})$/i);
  if (!match) {
    await sendMessage(chatId, "ሥርዓቱን ለማያያዝ: /link XXXXXXXX");
    return NextResponse.json({ ok: true });
  }

  const code = match[1].toUpperCase();

  // Look up the pending verification code in AppSetting
  const setting = await db.appSetting.findUnique({ where: { key: `telegram_link_${code}` } });
  if (!setting) {
    await sendMessage(chatId, "❌ ኮዱ ትክክል አይደለም ወይም ጊዜው አልፏል።");
    return NextResponse.json({ ok: true });
  }

  const userId = setting.value;

  // Store the chat ID in TelegramRecipient
  const user = await db.appUser.findUnique({ where: { id: userId } });
  if (!user) {
    await sendMessage(chatId, "❌ ተጠቃሚው አልተገኘም።");
    return NextResponse.json({ ok: true });
  }

  // Determine allowed reports based on role
  const managerReports = [
    "DAILY_SUMMARY", "DAILY_PRODUCTION_SHEET", "INCENTIVE_STATEMENT",
    "MONTHLY_INCENTIVE_SUMMARY", "MONTHLY_SALARY_SCHEDULE", "RUNNING_INCENTIVE",
  ] as const;
  const deptReports = ["DAILY_SUMMARY", "DAILY_PRODUCTION_SHEET"] as const;

  const allowed = (user.role === "ADMIN" || user.role === "SUPER_MANAGER")
    ? [...managerReports]
    : [...deptReports];

  await db.telegramRecipient.upsert({
    where:  { userId },
    update: { chatId, isActive: true, verifiedAt: new Date(), allowedReports: allowed },
    create: { userId, chatId, isActive: true, verifiedAt: new Date(), allowedReports: allowed },
  });

  // Remove the one-time code
  await db.appSetting.delete({ where: { key: `telegram_link_${code}` } });

  await sendMessage(chatId, `✅ ተያይዟል! እንኳን ደስ አለዎ ${user.role === "SUPER_MANAGER" ? "ሱፐር ማኔጀር" : "አስተዳዳሪ"} 🎉`);
  return NextResponse.json({ ok: true });
}
