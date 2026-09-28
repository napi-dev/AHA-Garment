"use client";

import { WifiOff, RotateCw } from "lucide-react";

/**
 * Offline fallback page — shown by the service worker when the user is
 * offline and the page is not in the cache.
 */
export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white px-4 relative overflow-hidden">
      <div className="absolute inset-0 stitch-pattern opacity-10 pointer-events-none" />
      <div className="w-full max-w-md text-center p-8 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl relative z-10 space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto ring-4 ring-rose-500/10">
          <WifiOff size={36} />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-ethiopic tracking-tight">
            የበይነመረብ (Internet) ግንኙነት ተቋርጧል
          </h1>
          <p className="text-slate-400 font-ethiopic text-sm leading-relaxed">
            መሳሪያዎ ከዋናው ሰርቨር ጋር መገናኘት አልቻለም። የተመዘገቡ የቁጥር ረቂቆች በመሳሪያዎ ላይ ተቀምጠዋል፤ ግንኙነቱ ሲመለስ ወዲያው ይላካሉ።
          </p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-ethiopic font-semibold hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 text-sm"
        >
          <RotateCw size={16} />
          <span>ገጹን በድጋሚ ጫን (Refresh)</span>
        </button>

        <p className="text-xs text-slate-500 font-ethiopic">
          የአካባቢ ኔትወርክ ወይም ዋይፋይ መብራቱን ያረጋግጡ
        </p>
      </div>
    </div>
  );
}
