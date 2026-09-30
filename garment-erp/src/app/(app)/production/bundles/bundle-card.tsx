"use client";

import { useState, useTransition } from "react";
import { advanceBundleStage } from "./actions";
import { ChevronRight, Tag, Loader2, CheckCircle2 } from "lucide-react";

interface BundleCardProps {
  bundle: {
    id: string;
    bundleCode: string;
    quantity: number;
    cutJob: {
      order: {
        orderNumber: string;
        style: { nameAm: string };
      };
    };
  };
  canAdvance: boolean;
  currentStage: string;
  userId: string;
  STAGE_AM: Record<string, string>;
  STAGES: readonly string[];
  colors: { header: string; card: string; badge: string };
}

export function BundleCard({
  bundle, canAdvance, currentStage, userId, STAGE_AM, STAGES, colors,
}: BundleCardProps) {
  const stageIdx  = STAGES.indexOf(currentStage);
  const nextStage = stageIdx < STAGES.length - 1 ? STAGES[stageIdx + 1] : null;

  const [isPending, startTransition] = useTransition();
  const [done, setDone]              = useState(false);

  function handleAdvance() {
    if (!nextStage) return;
    startTransition(async () => {
      await advanceBundleStage(bundle.id, nextStage, userId);
      setDone(true);
      // Reset success indicator after 2 s
      setTimeout(() => setDone(false), 2000);
    });
  }

  return (
    <div className={`bg-white rounded-xl p-3 border transition-all ${colors.card} ${
      done ? "ring-2 ring-emerald-400 bg-emerald-50/30" : "hover:shadow-sm"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold text-slate-700 truncate">{bundle.bundleCode}</p>
          <p className="font-ethiopic text-xs text-slate-600 truncate mt-0.5">
            {bundle.cutJob.order.style.nameAm}
          </p>
          <p className="text-xs text-slate-400 tabular-nums mt-0.5">{bundle.quantity} ፍሬ</p>

          {/* Success indicator */}
          {done && (
            <p className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold font-ethiopic mt-1">
              <CheckCircle2 size={11} className="text-emerald-600" />
              ወደ {STAGE_AM[nextStage ?? ""] ?? ""} ተላልፏል ✓
            </p>
          )}
        </div>

        {canAdvance && nextStage && (
          <div className="flex gap-1 flex-col items-end shrink-0">
            {/* Tag button — unchanged */}
            <a
              href={`/api/tag/${bundle.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Tag size={9} /> ታግ
            </a>

            {/* Advance stage button with loading + success states */}
            <button
              onClick={handleAdvance}
              disabled={isPending || done}
              className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-colors font-ethiopic whitespace-nowrap font-semibold disabled:opacity-70 disabled:cursor-not-allowed ${
                done
                  ? "bg-emerald-100 text-emerald-700"
                  : colors.badge
              }`}
            >
              {isPending ? (
                <>
                  <Loader2 size={9} className="animate-spin" />
                  <span>...</span>
                </>
              ) : done ? (
                <>
                  <CheckCircle2 size={9} />
                  <span>ተጠናቋል</span>
                </>
              ) : (
                <>
                  <ChevronRight size={9} />
                  <span>{STAGE_AM[nextStage]}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
