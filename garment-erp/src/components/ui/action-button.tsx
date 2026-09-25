"use client";

import { useTransition, useState } from "react";

interface ActionButtonProps {
  action: () => Promise<void>;
  label: string;
  loadingLabel?: string;
  className?: string;
  variant?: "primary" | "danger" | "success";
  confirmMessage?: string;
}

const VARIANT_CLASSES = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  danger:  "bg-red-600  text-white hover:bg-red-700",
  success: "bg-green-600 text-white hover:bg-green-700",
};

/**
 * Button that wraps a server action with:
 *  - useTransition pending state
 *  - Optional confirmation dialog
 *  - Error display
 *  - Disabled while pending (prevents double-submit)
 */
export function ActionButton({
  action,
  label,
  loadingLabel,
  className = "",
  variant = "primary",
  confirmMessage,
}: ActionButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        setError(e instanceof Error ? e.message : "ስህተት ተፈጥሯል");
      }
    });
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`px-4 py-2.5 rounded-xl text-sm font-ethiopic font-semibold transition-all
          active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed
          ${VARIANT_CLASSES[variant]} ${className}`}
      >
        {isPending ? (loadingLabel ?? "...") : label}
      </button>
      {error && (
        <p className="text-xs text-red-600 font-ethiopic">{error}</p>
      )}
    </div>
  );
}
