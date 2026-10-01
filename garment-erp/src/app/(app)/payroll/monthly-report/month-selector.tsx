"use client";

import { useState } from "react";
import { ethMonthName } from "@/lib/ethiopian-calendar";
import { FileText } from "lucide-react";
import { TelegramSendButton } from "@/components/telegram-send-button";

interface Props {
  currentYear: number;
  currentMonth: number;
}

export function MonthSelector({ currentYear, currentMonth }: Props) {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const ethiopianMonths = [
    { value: 1, label: ethMonthName(1) },
    { value: 2, label: ethMonthName(2) },
    { value: 3, label: ethMonthName(3) },
    { value: 4, label: ethMonthName(4) },
    { value: 5, label: ethMonthName(5) },
    { value: 6, label: ethMonthName(6) },
    { value: 7, label: ethMonthName(7) },
    { value: 8, label: ethMonthName(8) },
    { value: 9, label: ethMonthName(9) },
    { value: 10, label: ethMonthName(10) },
    { value: 11, label: ethMonthName(11) },
    { value: 12, label: ethMonthName(12) },
    { value: 13, label: ethMonthName(13) },
  ];

  // Generate year options (current year ± 5 years)
  const years = [];
  for (let i = currentYear - 5; i <= currentYear + 2; i++) {
    years.push(i);
  }

  const handleGenerateReport = () => {
    const url = `/api/reports/monthly?year=${selectedYear}&month=${selectedMonth}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Year Selector */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2 font-ethiopic">
            ዓመት (Ethiopian Year)
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-ethiopic text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year} ዓ.ም
              </option>
            ))}
          </select>
        </div>

        {/* Month Selector */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2 font-ethiopic">
            ወር (Ethiopian Month)
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-ethiopic text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            {ethiopianMonths.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Preview */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-sm text-slate-500 font-ethiopic mb-1">የተመረጠው ወቅት:</p>
        <p className="text-xl font-bold text-slate-800 font-ethiopic">
          {ethMonthName(selectedMonth)} {selectedYear} ዓ.ም
        </p>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerateReport}
        className="w-full btn-primary flex items-center justify-center gap-3 py-4 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-ethiopic shadow-lg hover:shadow-xl transition-all"
      >
        <FileText size={20} />
        <span>ሪፖርት አውጣ (PDF)</span>
      </button>

      {/* Telegram Send Button */}
      <TelegramSendButton
        reportUrl={`/api/reports/monthly?year=${selectedYear}&month=${selectedMonth}`}
        reportTitle="የወር ክፍያ ሪፖርት"
        reportDate={`${ethMonthName(selectedMonth)} ${selectedYear} ዓ.ም`}
        className="w-full"
      />
    </div>
  );
}
