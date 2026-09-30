"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Save } from "lucide-react";
import { am } from "@/lib/i18n/am";

export function CutJobSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 font-ethiopic disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {pending ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          <span>በማስቀመጥ ላይ...</span>
        </>
      ) : (
        <>
          <Save size={16} />
          <span>{am.save}</span>
        </>
      )}
    </button>
  );
}
