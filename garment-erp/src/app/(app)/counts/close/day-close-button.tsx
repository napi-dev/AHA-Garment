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
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  if (alreadyClosed) {
    return (
      <div className="erp-card p-8 text-center border-purple-200 bg-gradient-to-b from-purple-50/50 to-white space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto shadow-sm">
          <Lock size={32} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 font-ethiopic">
            {am.counts.dayAlreadyClosed}
          </h3>
          {closedAt && (
            <p className="text-slate-500 font-ethiopic text-sm mt-1">
              በ {new Date(closedAt).toLocaleTimeString("en-ET")} ተጠቃልሎ ተቆልፏል
            </p>
          )}
        </div>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="btn-secondary text-xs"
          >
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
      await closeDay(date, notes || undefined);
      router.push("/dashboard");
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
        <div className="alert-error font-ethiopic text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="text-rose-600 flex-shrink-0" />
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
