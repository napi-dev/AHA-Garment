"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Registers the service worker and shows a PWA install banner
 * on tablets/phones that support installation.
 */
export function PwaInit() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => { /* SW registration is best-effort */ });
    }

    // Capture install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!installPrompt || dismissed) return null;

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstallPrompt(null);
    setDismissed(true);
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white shadow-xl rounded-2xl border border-gray-200 px-5 py-4 flex items-center gap-4 max-w-sm w-[calc(100%-2rem)]">
      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
        ፋ
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm font-ethiopic">ያስጭኑ</p>
        <p className="text-xs text-gray-500 font-ethiopic">ለፈጣን መዳረሻ ጫኑ</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={() => setDismissed(true)}
          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 font-ethiopic">
          ኋላ
        </button>
        <button onClick={install}
          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-ethiopic hover:bg-blue-700 transition-colors">
          ጫን
        </button>
      </div>
    </div>
  );
}
