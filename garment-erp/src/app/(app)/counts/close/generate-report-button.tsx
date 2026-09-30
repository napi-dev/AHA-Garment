"use client";

import { useState } from "react";
import { FileText, Calendar, Printer, ExternalLink } from "lucide-react";
import { formatAsEthDate, todayISOStringEAT } from "@/lib/ethiopian-calendar";

interface Props {
  date: string; // ISO string — default date (today or working date)
}

export function GenerateReportButton({ date: defaultDate }: Props) {
  const [selectedDate, setSelectedDate] = useState(defaultDate.split("T")[0]);
  
  function handleOpenReport() {
    // Open the HTML report in a new tab - it will auto-trigger print dialog
    const url = `/api/reports/daily/${selectedDate}`;
    window.open(url, "_blank");
  }

  // Format selected date for display
  const displayDate = formatAsEthDate(new Date(selectedDate + "T12:00:00Z"));

  return (
    <div className="erp-card p-6 space-y-4 border-blue-100 bg-gradient-to-b from-blue-50/30 to-white">
      <div className="flex items-center gap-2">
        <FileText size={18} className="text-blue-600" />
        <h2 className="font-bold text-slate-800 font-ethiopic text-base">
          የዕለት ሪፖርት ክፈትና አትም
        </h2>
      </div>

      <p className="text-xs text-slate-500 font-ethiopic leading-relaxed">
        የዕለቱን ምርት ሪፖርት በአዲስ መስኮት ይክፈቱ። ሕትመት ለማድረግ ወይም ወደ PDF ለማዳን የህትመት መስኮቱን ይጠቀሙ።
      </p>

      {/* Date picker */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-ethiopic flex items-center gap-1.5">
          <Calendar size={14} className="text-slate-400" />
          <span>ሪፖርት ለመክፈት ቀን</span>
        </label>
        <input
          type="date"
          value={selectedDate}
          max={todayISOStringEAT().split("T")[0]}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="input-field text-center font-mono text-sm"
        />
        <p className="text-xs text-slate-400 font-ethiopic mt-1">
          {displayDate}
        </p>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-2 text-xs font-ethiopic px-3 py-2.5 rounded-xl border bg-blue-50/50 border-blue-200/50 text-slate-700">
        <Printer size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">የህትመት ቁልፎች:</p>
          <ul className="space-y-0.5 text-slate-600">
            <li>• <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">Ctrl + P</kbd> — የህትመት መስኮት ለመክፈት</li>
            <li>• "Destination" ላይ <strong>"Save as PDF"</strong> ይምረጡ</li>
            <li>• ሪፖርቱ 2 ገጾች አሉት (ምርት + የሥርዓት ምዝገባ)</li>
          </ul>
        </div>
      </div>

      <button
        onClick={handleOpenReport}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition-all font-ethiopic shadow-sm flex items-center justify-center gap-2"
      >
        <ExternalLink size={16} />
        <span>ሪፖርት ክፈት እና አትም</span>
      </button>
    </div>
  );
}
