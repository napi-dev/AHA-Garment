"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { closeDay } from "../actions";
import { am } from "@/lib/i18n/am";

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
      <div className="bg-purple-50 rounded-2xl p-6 text-center border border-purple-100">
        <p className="text-4xl mb-3">🔒</p>
        <p className="font-semibold text-purple-800 font-ethiopic text-lg">
          {am.counts.dayAlreadyClosed}
        </p>
        {closedAt && (
          <p className="text-purple-500 text-sm mt-1">
            {new Date(closedAt).toLocaleTimeString("en-ET")}
          </p>
        )}
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      <h2 className="font-semibold text-gray-800 font-ethiopic">ቀን ዝጋ</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">
          {am.notes} (አማራጭ)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none
            focus:ring-2 focus:ring-blue-500 text-sm font-ethiopic resize-none"
          placeholder="ዛሬ ልዩ ነገር ካለ ጻፉ..."
        />
      </div>

      {error && (
        <p className="text-red-600 text-sm font-ethiopic bg-red-50 rounded-lg p-3">{error}</p>
      )}

      <button
        onClick={handleClose}
        disabled={loading}
        className="w-full py-4 rounded-xl bg-purple-600 text-white font-semibold text-lg
          hover:bg-purple-700 active:scale-[0.98] transition-all
          disabled:opacity-50 disabled:cursor-not-allowed font-ethiopic"
      >
        {loading ? "በመዝጋት ላይ..." : "🔒 " + am.counts.closeDay}
      </button>

      <p className="text-xs text-gray-400 font-ethiopic text-center">
        ቀኑ ሲዘጋ ሁሉም ቁጥሮች ይቆለፋሉ እና ሪፖርቶቹ ይዘጋጃሉ።
      </p>
    </div>
  );
}
