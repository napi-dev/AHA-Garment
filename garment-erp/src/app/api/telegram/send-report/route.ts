import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendMessage } from "@/lib/automation/telegram";

export const dynamic = "force-dynamic";

/**
 * POST /api/telegram/send-report
 * Sends a report URL via Telegram with inline button
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { chatId, reportUrl, reportTitle, reportDate } = body;

    console.log("Telegram send request:", { chatId, reportUrl, reportTitle, reportDate });

    if (!chatId || !reportUrl || !reportTitle) {
      return NextResponse.json(
        { error: "Missing required fields: chatId, reportUrl, reportTitle" },
        { status: 400 }
      );
    }

    // Prepare Telegram message with inline button
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
    if (!BOT_TOKEN) {
      console.error("TELEGRAM_BOT_TOKEN not set in environment");
      return NextResponse.json(
        { error: "Telegram bot not configured" },
        { status: 500 }
      );
    }

    const message = `📊 <b>${reportTitle}</b>\n${reportDate ? `ቀን: ${reportDate}\n` : ""}\nሪፖርቱን ለመክፈት ከታች ያለውን ቁልፍ ይጫኑ።`;

    // Check if URL is localhost (development)
    const isLocalhost = reportUrl.includes("localhost") || reportUrl.includes("127.0.0.1");

    if (isLocalhost) {
      // For localhost, send as plain text link (Telegram doesn't support localhost in buttons)
      const simpleMessage = `📊 <b>${reportTitle}</b>\n${reportDate ? `ቀን: ${reportDate}\n` : ""}\n\n⚠️ <i>ማስታወሻ: ይህ የአካባቢ አገናኝ ነው። በአሳሽዎ ውስጥ መክፈት ያለብዎት:</i>\n\n<code>${reportUrl}</code>\n\nወይም በምርት አካባቢ (production) ላይ ይሞክሩ።`;
      
      const response = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: simpleMessage,
            parse_mode: "HTML",
          }),
        }
      );

      const data = await response.json();
      console.log("Telegram API response:", data);

      if (!data.ok) {
        console.error("Telegram send failed:", data);
        return NextResponse.json(
          { error: data.description || "Failed to send message" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        messageId: data.result?.message_id,
      });
    }

    // For production URLs, send with inline button
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📄 ሪፖርት ክፈት",
                  url: reportUrl,
                },
              ],
            ],
          },
        }),
      }
    );

    const data = await response.json();
    console.log("Telegram API response:", data);

    if (!data.ok) {
      console.error("Telegram send failed:", data);
      return NextResponse.json(
        { error: data.description || "Failed to send message" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: data.result?.message_id,
    });
  } catch (error) {
    console.error("Telegram send error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
