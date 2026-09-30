"use client";

import { useState, useTransition } from "react";
import { FileText, Send, Loader2, CheckCircle2, AlertTriangle, Calendar } from "lucide-react";
import { generateAndSendDailyReport } from "../actions";
import { formatAsEthDate, todayISOStringEAT } from "@/lib/ethiopian-calendar";

interface Props {
  date: string; // ISO string — default date (today or working date)
}

export function GenerateReportButton({ date: defaultDate }: Props) {
  const [selectedDate, setSelectedDate] = useState(defaultDate.split("T")[0]);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function handleGenerate() {
    startTransition(async () => {
      const res = await generateAndSendDailyReport(selectedDate + "T00:00:00Z");
      setResult(res);
    });
  }

  // Format selected date for display
  const displayDate = formatAsEthDate(new Date(selectedDate + "T12:00:00Z"));

  return (
    <div className="erp-card p-6 space-y-4 border-blue-100 bg-gradient-to-b from-blue-50/30 to-white">
      <div className="flex items-center gap-2">
        <FileText size={18} className="text-blue-600" />
        <h2 className="font-bold text-slate-800 font-ethiopic text-base">
          የዕለት ሪፖርት ፍጠርና ላክ
        </h2>
      </div>

      <p className="text-xs text-slate-500 font-ethiopic leading-relaxed">
        የዕለቱን ምርት ሪፖርት PDF ፍጠርና ወደ Telegram ቡድን ላክ። ቀኑ ሲዘጋ ወይም በኋላ ማስሄድ ይቻላል። የቀድሞ ቀናትንም መምረጥ ይቻላል።
      </p>

      {/* Date picker */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-ethiopic flex items-center gap-1.5">
          <Calendar size={14} className="text-slate-400" />
          <span>ሪፖርት ለማዘጋጀት ቀን</span>
        </label>
        <input
          type="date"
          value={selectedDate}
          max={todayISOStringEAT()}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setResult(null); // clear previous result when date changes
          }}
          className="input-field text-center font-mono text-sm"
        />
        <p className="text-xs text-slate-400 font-ethiopic mt-1">
          {displayDate}
        </p>
      </div>

      {result && (
        <div className={`flex items-start gap-2 text-xs font-ethiopic px-3 py-2.5 rounded-xl border ${
          result.ok
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-amber-50 border-amber-200 text-amber-800"
        }`}>
          {result.ok
            ? <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            : <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
          }
          <span>{result.message}</span>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={isPending}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-ethiopic shadow-sm flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>ሪፖርቱ በማዘጋጀት ላይ...</span>
          </>
        ) : (
          <>
            <Send size={16} />
            <span>PDF ፍጠርና ወደ Telegram ላክ</span>
          </>
        )}
      </button>
    </div>
  );
}
