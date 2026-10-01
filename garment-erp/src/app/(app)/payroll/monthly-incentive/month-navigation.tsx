"use client";

import Link from "next/link";
import { ethMonthName } from "@/lib/ethiopian-calendar";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  currentYear: number;
  currentMonth: number;
  basePath: string;
}

export function MonthNavigation({ currentYear, currentMonth, basePath }: Props) {
  // Calculate previous month
  let prevMonth = currentMonth - 1;
  let prevYear = currentYear;
  if (prevMonth < 1) {
    prevMonth = 13;
    prevYear -= 1;
  }

  // Calculate next month
  let nextMonth = currentMonth + 1;
  let nextYear = currentYear;
  if (nextMonth > 13) {
    nextMonth = 1;
    nextYear += 1;
  }

  return (
    <div className="erp-card p-4">
      <div className="flex items-center justify-between">
        <Link
          href={`${basePath}?year=${prevYear}&month=${prevMonth}`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors font-ethiopic text-sm"
        >
          <ChevronLeft size={16} />
          <span>{ethMonthName(prevMonth)} {prevYear}</span>
        </Link>

        <div className="text-center">
          <p className="text-xs text-slate-500 font-ethiopic mb-1">የተመረጠው ወር</p>
          <p className="text-lg font-bold text-slate-800 font-ethiopic">
            {ethMonthName(currentMonth)} {currentYear} ዓ.ም
          </p>
        </div>

        <Link
          href={`${basePath}?year=${nextYear}&month=${nextMonth}`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors font-ethiopic text-sm"
        >
          <span>{ethMonthName(nextMonth)} {nextYear}</span>
          <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}
