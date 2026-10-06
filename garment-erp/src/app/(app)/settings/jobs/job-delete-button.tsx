"use client";

import { Trash2 } from "lucide-react";

interface JobDeleteButtonProps {
  jobId: string;
  jobName: string;
  hasHistory: boolean;
  action: (formData: FormData) => void | Promise<void>;
}

export function JobDeleteButton({
  jobId,
  jobName,
  hasHistory,
  action,
}: JobDeleteButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const msg = hasHistory
          ? `'${jobName}' የስራ ዓይነት የታሪክ ምዝገባዎች ስላሉት ይሰረዛል ሳይሆን ቦዝኗል የሚደረገው። እርግጠኛ ነዎት?`
          : `'${jobName}' የስራ ዓይነት ሙሉ በሙሉ ይሰረዝ?`;
        if (!confirm(msg)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        title="ስራውን ሰርዝ"
        className="text-xs px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 flex items-center gap-1 transition-colors"
      >
        <Trash2 size={14} />
        <span>{hasHistory ? "አስወግድ" : "ሰርዝ"}</span>
      </button>
    </form>
  );
}
