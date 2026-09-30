"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Save } from "lucide-react";
import { am } from "@/lib/i18n/am";

/**
 * Submit button for each incentive card row.
 * Uses useFormStatus to show a spinner while the server action is running.
 * Must be rendered *inside* the <form> element.
 */
export function IncentiveCardSaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary text-xs py-2.5 px-4 flex items-center gap-1.5 w-full md:w-auto justify-center disabled:opacity-70 disabled:cursor-not-allowed min-w-[110px]"
    >
      {pending ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          <span>በማስቀመጥ ላይ...</span>
        </>
      ) : (
        <>
          <Save size={14} />
          <span>{am.save}</span>
        </>
      )}
    </button>
  );
}
