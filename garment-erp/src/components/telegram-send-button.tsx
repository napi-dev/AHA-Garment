"use client";

import { useState } from "react";
import { Send, Check, AlertCircle, X } from "lucide-react";

interface TelegramSendButtonProps {
  reportUrl: string;
  reportTitle: string;
  reportDate?: string;
  className?: string;
}

export function TelegramSendButton({
  reportUrl,
  reportTitle,
  reportDate,
  className = "",
}: TelegramSendButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const recipients = [
    { id: "manager", name: "ሱፐር ማኔጀር / አስተዳዳሪ", chatId: process.env.NEXT_PUBLIC_TELEGRAM_MANAGER_CHAT_ID },
    { id: "dept", name: "የክፍል ሀላፊዎች", chatId: process.env.NEXT_PUBLIC_TELEGRAM_DEPT_GROUP_CHAT_ID },
  ].filter(r => r.chatId); // Only show configured recipients

  async function handleSend(chatId: string) {
    setIsLoading(true);
    setStatus("idle");
    setErrorMessage("");

    try {
      const baseUrl = window.location.origin;
      const fullReportUrl = reportUrl.startsWith("http") 
        ? reportUrl 
        : `${baseUrl}${reportUrl}`;

      // Send to selected recipient
      const response = await fetch("/api/telegram/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          reportUrl: fullReportUrl,
          reportTitle,
          reportDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "መላክ አልተሳካም");
      }

      // Also send to admin if sending to manager
      const adminChatId = process.env.NEXT_PUBLIC_TELEGRAM_ADMIN_CHAT_ID;
      if (adminChatId && chatId === process.env.NEXT_PUBLIC_TELEGRAM_MANAGER_CHAT_ID && chatId !== adminChatId) {
        await fetch("/api/telegram/send-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: adminChatId,
            reportUrl: fullReportUrl,
            reportTitle,
            reportDate,
          }),
        });
      }

      setStatus("success");
      setTimeout(() => {
        setIsOpen(false);
        setStatus("idle");
      }, 2000);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "መላክ አልተሳካም");
    } finally {
      setIsLoading(false);
    }
  }

  if (recipients.length === 0) {
    return null; // Don't show button if Telegram not configured
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold text-sm hover:from-blue-700 hover:to-cyan-700 active:scale-[0.98] transition-all font-ethiopic shadow-sm ${className}`}
      >
        <Send size={16} />
        <span>ወደ ቴሌግራም ላክ</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Send size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 font-ethiopic">ሪፖርት ላክ</h3>
                  <p className="text-xs text-slate-500 font-ethiopic">ወደ ቴሌግራም</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            {/* Report Info */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm font-semibold text-slate-700 font-ethiopic mb-1">
                {reportTitle}
              </p>
              {reportDate && (
                <p className="text-xs text-slate-500 font-ethiopic">{reportDate}</p>
              )}
            </div>

            {/* Recipients */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-600 font-ethiopic">
                ለማን መላክ ይፈልጋሉ?
              </p>
              <div className="space-y-2">
                {recipients.map((recipient) => (
                  <button
                    key={recipient.id}
                    onClick={() => handleSend(recipient.chatId!)}
                    disabled={isLoading || status === "success"}
                    className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <span className="font-ethiopic text-slate-700 group-hover:text-blue-700 font-medium">
                      {recipient.name}
                    </span>
                    <Send size={16} className="text-slate-400 group-hover:text-blue-600" />
                  </button>
                ))}
              </div>
            </div>

            {/* Status Messages */}
            {status === "success" && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <Check size={18} className="text-emerald-600 flex-shrink-0" />
                <p className="text-sm text-emerald-800 font-ethiopic">
                  ሪፖርቱ በተሳካ ሁኔታ ተልኳል!
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <AlertCircle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-rose-800 font-ethiopic font-semibold">
                    መላክ አልተሳካም
                  </p>
                  <p className="text-xs text-rose-700 font-ethiopic mt-0.5">
                    {errorMessage}
                  </p>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex items-center justify-center gap-3 p-4">
                <div className="w-5 h-5 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-slate-600 font-ethiopic">በመላክ ላይ...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
