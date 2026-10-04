"use client";

import { useState, useTransition } from "react";
import { Calendar, Pencil, X, Check, RotateCcw, Loader2, AlertCircle } from "lucide-react";
import { setEthDateOverride, clearEthDateOverride } from "@/lib/date-override/actions";

const ETH_MONTHS = [
  "መስከረም", "ጥቅምት", "ህዳር", "ታህሳስ", "ጥር", "የካቲት",
  "መጋቢት", "ሚያዚያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ",
];

interface Props {
  /** Formatted string to display in header, e.g. "18 መስከረም 2019 ዓ.ም (18/1/2019 ዓ.ም)" */
  ethDateDisplay: string;
  /** Is there an active manual override? */
  isOverridden: boolean;
  /** Current effective Ethiopian date values for pre-filling the form */
  ethYear: number;
  ethMonth: number;
  ethDay: number;
  /** Whether this user can edit the date (ADMIN or PRODUCTION_MANAGER) */
  canEdit: boolean;
}

export function DateOverrideBadge({
  ethDateDisplay,
  isOverridden,
  ethYear,
  ethMonth,
  ethDay,
  canEdit,
}: Props) {
  const [open, setOpen] = useState(false);
  const [formYear, setFormYear] = useState(String(ethYear));
  const [formMonth, setFormMonth] = useState(String(ethMonth));
  const [formDay, setFormDay] = useState(String(ethDay));
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function openDialog() {
    setFormYear(String(ethYear));
    setFormMonth(String(ethMonth));
    setFormDay(String(ethDay));
    setError("");
    setOpen(true);
  }

  function handleSave() {
    setError("");
    const y = parseInt(formYear);
    const m = parseInt(formMonth);
    const d = parseInt(formDay);
    if (!y || !m || !d || m < 1 || m > 13 || d < 1 || d > 30) {
      setError("ትክክለኛ ቀን ያስገቡ (ቀን 1-30፣ ወር 1-13)");
      return;
    }
    startTransition(async () => {
      const res = await setEthDateOverride(y, m, d);
      if (res.ok) {
        setOpen(false);
      } else {
        setError(res.message);
      }
    });
  }

  function handleClear() {
    startTransition(async () => {
      await clearEthDateOverride();
      setOpen(false);
    });
  }

  return (
    <>
      {/* Badge */}
      <div
        className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-ethiopic transition-colors ${
          isOverridden
            ? "bg-amber-50 border-amber-300 text-amber-800"
            : "bg-slate-100/80 border-slate-200/70 text-slate-700"
        }`}
      >
        <Calendar size={14} className={isOverridden ? "text-amber-600" : "text-blue-600"} />
        <span className="font-medium">{ethDateDisplay}</span>
        {isOverridden && (
          <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
            ተስተካክሏል
          </span>
        )}
        {canEdit && (
          <button
            onClick={openDialog}
            title="ቀን አስተካክል"
            className="ml-1 p-0.5 rounded hover:bg-slate-200/70 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <Pencil size={11} />
          </button>
        )}
      </div>

      {/* Dialog backdrop */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-blue-600" />
                <h2 className="font-bold text-slate-800 font-ethiopic text-sm">
                  ዛሬን ቀን አስተካክል
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500 font-ethiopic leading-relaxed">
                የኢትዮጵያ የቀን አቆጣጠር ስህተት ካለ ከዚህ ያስተካክሉ። ይህ ማሻሻያ ለሁሉም ሥርዓቱ ይተገብራሉ።
              </p>

              <div className="grid grid-cols-3 gap-3">
                {/* Day */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 font-ethiopic">
                    ቀን
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={formDay}
                    onChange={(e) => setFormDay(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-center font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Month */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 font-ethiopic">
                    ወር
                  </label>
                  <select
                    value={formMonth}
                    onChange={(e) => setFormMonth(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-2 py-2 text-xs font-ethiopic focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ETH_MONTHS.map((name, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}. {name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 font-ethiopic">
                    ዓ.ም
                  </label>
                  <input
                    type="number"
                    min={2010}
                    max={2050}
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-center font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="bg-blue-50 border border-blue-200/60 rounded-xl px-4 py-2.5 text-xs font-ethiopic text-blue-800 text-center">
                ቀን {formDay} {ETH_MONTHS[(parseInt(formMonth) || 1) - 1]} {formYear} ዓ.ም
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-rose-600 font-ethiopic bg-rose-50 border border-rose-200/60 rounded-xl px-3 py-2">
                  <AlertCircle size={13} />
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 pb-5 gap-3">
              {isOverridden ? (
                <button
                  onClick={handleClear}
                  disabled={isPending}
                  className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors font-ethiopic disabled:opacity-50"
                >
                  <RotateCcw size={13} />
                  ወደ ራስ-ሰር ቀን ተመለስ
                </button>
              ) : (
                <span />
              )}

              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100 transition-colors font-ethiopic"
                >
                  ሰርዝ
                </button>
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-ethiopic disabled:opacity-60"
                >
                  {isPending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Check size={13} />
                  )}
                  አስቀምጥ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
