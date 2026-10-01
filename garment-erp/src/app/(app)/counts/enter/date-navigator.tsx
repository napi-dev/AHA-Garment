"use client";

import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatAsEthDate, todayISOStringEAT } from "@/lib/ethiopian-calendar";
import { useRouter } from "next/navigation";

interface DateNavigatorProps {
  currentDate: string; // YYYY-MM-DD
  isToday: boolean;
  deptId?: string;
}

export function DateNavigator({ currentDate, isToday, deptId }: DateNavigatorProps) {
  const router = useRouter();
  const dateObj = new Date(currentDate + "T12:00:00Z");
  const ethDisplay = formatAsEthDate(dateObj);

  // Calculate prev/next dates
  const prevDate = new Date(dateObj);
  prevDate.setUTCDate(prevDate.getUTCDate() - 1);
  const nextDate = new Date(dateObj);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  const prevDateISO = prevDate.toISOString().split("T")[0];
  const nextDateISO = nextDate.toISOString().split("T")[0];
  const maxDateISO = todayISOStringEAT().split("T")[0];

  // Build URLs preserving dept
  const buildUrl = (date: string) => {
    const params = new URLSearchParams();
    params.set("date", date);
    if (deptId) params.set("dept", deptId);
    return `/counts/enter?${params.toString()}`;
  };

  const handleDateChange = (newDate: string) => {
    if (newDate) {
      router.push(buildUrl(newDate));
    }
  };

  const canGoNext = nextDateISO <= maxDateISO;

  return (
    <div className="erp-card p-5 border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-sm">
            <Calendar size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-ethiopic mb-0.5">የምርት ቀን</p>
            <p className="text-lg font-bold text-slate-900 font-ethiopic">{ethDisplay}</p>
          </div>
          {isToday ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 font-ethiopic">
              የአሁኑ ቀን
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 font-ethiopic">
              የቀድሞ ቀን
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={buildUrl(prevDateISO)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors text-slate-700 flex items-center gap-1.5 text-xs font-semibold font-ethiopic shadow-sm"
          >
            <ChevronLeft size={14} />
            <span>ቀዳሚ ቀን</span>
          </Link>

          <input
            type="date"
            value={currentDate}
            max={maxDateISO}
            onChange={(e) => handleDateChange(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono bg-white hover:border-slate-300 transition-colors shadow-sm"
          />

          {canGoNext ? (
            <Link
              href={buildUrl(nextDateISO)}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors text-slate-700 flex items-center gap-1.5 text-xs font-semibold font-ethiopic shadow-sm"
            >
              <span>ቀጣይ ቀን</span>
              <ChevronRight size={14} />
            </Link>
          ) : (
            <span className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed flex items-center gap-1.5 text-xs font-semibold font-ethiopic shadow-sm">
              <span>ቀጣይ ቀን</span>
              <ChevronRight size={14} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
