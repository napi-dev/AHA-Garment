"use client";

import { useEffect, useState } from "react";

/**
 * Shows a banner when the browser loses network connectivity.
 * Entries are already saved as DRAFT server-side; this tells the user
 * that the connection is gone and actions will fail.
 */
export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => { setOnline(false); setWasOffline(true); };
    const goOnline  = () => {
      setOnline(true);
      // Clear "back online" banner after 4 s
      setTimeout(() => setWasOffline(false), 4000);
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online",  goOnline);
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online",  goOnline);
    };
  }, []);

  if (online && !wasOffline) return null;

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-ethiopic font-semibold transition-all ${
      online
        ? "bg-green-600 text-white"
        : "bg-red-600 text-white animate-pulse"
    }`}>
      {online ? "✅ ኢንተርኔት ተመልሷል" : "⚠️ ኢንተርኔት አልተገናኘም — ረቂቆች ተቀምጠዋል"}
    </div>
  );
}
