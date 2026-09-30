"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { purgeMonthlyAuditLog } from "../actions";

export function PurgeAuditButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string; deleted: number } | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  function handleConfirm() {
    setConfirmed(true);
  }

  function handlePurge() {
    startTransition(async () => {
      const res = await purgeMonthlyAuditLog();
      setResult(res);
      setConfirmed(false);
    });
  }

  return (
    <div className="erp-card p-6 space-y-4 border-rose-100 bg-gradient-to-b from-rose-50/20 to-white">
      <div className="flex items-center gap-2">
        <Trash2 size={18} className="text-rose-500" />
        <h2 className="font-bold text-slate-800 font-ethiopic text-base">
          ወርሃዊ የምዝገባ ጽዳት
        </h2>
      </div>

      <p className="text-xs text-slate-500 font-ethiopic leading-relaxed">
        የዚህ ወር ምዝገቦች ጠብቅ — ከዚህ ወር በፊት ያሉ ሁሉንም የሥርዓት ምዝገቦች (Audit Log) ሰርዝ።
        <span className="block mt-1 text-amber-700 font-semibold">
          ⚠️ ይህ ድርጊት ሊቀለበስ አይችልም። ቀደም ሲሉ ሪፖርቶች ከ PDF ሰርዝ ካደረጉ ብቻ ያስሩ።
        </span>
      </p>

      {result && (
        <div className={`flex items-start gap-2 text-xs font-ethiopic px-3 py-2.5 rounded-xl border ${
          result.ok
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {result.ok
            ? <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            : <AlertTriangle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
          }
          <span>{result.message}</span>
        </div>
      )}

      {!confirmed ? (
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="w-full py-2.5 rounded-xl border-2 border-rose-300 text-rose-700 font-semibold text-sm hover:bg-rose-50 active:scale-[0.98] transition-all disabled:opacity-50 font-ethiopic flex items-center justify-center gap-2"
        >
          <ShieldAlert size={15} />
          <span>ወርሃዊ ምዝገቦችን ሰርዝ</span>
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-rose-700 font-ethiopic text-center">
            እርግጠኛ ነዎት? ይህ ሊቀለበስ አይችልም።
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmed(false)}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors font-ethiopic"
            >
              ሰርዝ
            </button>
            <button
              onClick={handlePurge}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 active:scale-[0.98] transition-all disabled:opacity-50 font-ethiopic flex items-center justify-center gap-2"
            >
              {isPending ? (
                <><Loader2 size={14} className="animate-spin" /><span>በመሰረዝ ላይ...</span></>
              ) : (
                <><Trash2 size={14} /><span>አዎ፣ ሰርዝ</span></>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
