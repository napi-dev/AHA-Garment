"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { closeDay } from "../actions";
import { am } from "@/lib/i18n/am";
import { Lock, CheckCircle2, AlertTriangle, ArrowRight, Loader2, FileEdit } from "lucide-react";
import Link from "next/link";

interface DayCloseButtonProps {
  date: string;
  alreadyClosed: boolean;
  closedAt: string | null;
}

export function DayCloseButton({ date, alreadyClosed, closedAt }: DayCloseButtonProps) {
  const [notes, setNotes]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [closed, setClosed] = useState(alreadyClosed);
  const [closedTime, setClosedTime] = useState(closedAt);
  const router = useRouter();

  // Already closed state — show locked card
  if (closed) {
    return (
      <div className="erp-card p-8 text-center border-emerald-200 bg-gradient-to-b from-emerald-50/40 to-white space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 size={32} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 font-ethiopic">
            {am.counts.dayAlreadyClosed}
          </h3>
          {closedTime && (
            <p className="text-slate-500 font-ethiopic text-sm mt-1">
              በ {new Date(closedTime).toLocaleTimeString("en-ET", { hour: "2-digit", minute: "2-digit" })} ተጠቃልሎ ተቆልፏል
            </p>
          )}
        </div>
        <div className="pt-2">
          <Link href="/dashboard" className="btn-secondary text-xs inline-flex items-center gap-2">
            <span>ወደ ዳሽቦርድ ተመለስ</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  async function handleClose() {
    if (!window.confirm("ቀኑን ለመዝጋት እርግጠኛ ነዎት? ከዘጋ በኋላ ቁጥሮችን መቀየር አይቻልም።")) return;
    setLoading(true);
    setError("");
    try {
      const result = await closeDay(date, notes || undefined);
      if (result.ok) {
        // Success — update state to show closed card instead of redirecting
        setClosed(true);
        setClosedTime(new Date().toISOString());
        router.refresh(); // refresh page data without full navigation
      } else {
        // Server returned a handled error (e.g. already closed)
        setError(result.message);
        // If already closed, flip to closed state
        if (result.message.includes("ቀድሞ ተዘግቷል")) {
          setClosed(true);
          setClosedTime(new Date().toISOString());
          router.refresh();
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "ስህተት ተፈጥሯል");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="erp-card p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Lock size={18} className="text-purple-600" />
        <h2 className="font-bold text-slate-800 font-ethiopic text-base">
          የዕለት ሥራ ማጠቃለያና መቆለፊያ
        </h2>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-ethiopic flex items-center gap-1.5">
          <FileEdit size={14} className="text-slate-400" />
          <span>{am.notes} (አማራጭ)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="input-field font-ethiopic resize-none"
          placeholder="የተለየ ክስተት፣ የኃይል መቆራረጥ ወይም ማብራሪያ ካለ እዚህ ያክሉ..."
        />
      </div>

      {error && (
        <div className={`font-ethiopic text-xs flex items-start gap-2 px-3 py-2.5 rounded-xl border ${
          error.includes("ቀድሞ ተዘግቷል")
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-rose-50 border-rose-200 text-rose-700"
        }`}>
          {error.includes("ቀድሞ ተዘግቷል")
            ? <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            : <AlertTriangle size={15} className="text-rose-600 flex-shrink-0 mt-0.5" />
          }
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleClose}
        disabled={loading}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-sm hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-ethiopic shadow-sm flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>በመዝጋት ላይ...</span>
          </>
        ) : (
          <>
            <Lock size={16} />
            <span>{am.counts.closeDay}</span>
          </>
        )}
      </button>

      <p className="text-xs text-slate-400 font-ethiopic text-center">
        ቀኑ ሲዘጋ ሁሉም ቁጥሮች ይቆለፋሉ፤ ኦፊሴላዊ የዕለት ሪፖርቶች ተዘጋጅተው ይላካሉ።
      </p>
    </div>
  );
}
