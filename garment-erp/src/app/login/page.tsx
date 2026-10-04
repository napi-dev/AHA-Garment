"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { am } from "@/lib/i18n/am";
import { Lock, User, Loader2, Sparkles, CheckCircle2, Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";

  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      employeeCode: code.trim().toUpperCase(),
      pin,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(am.login.invalidCredentials);
      setPin("");
    } else {
      router.push(callbackUrl);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Employee Code */}
      <div>
        <label
          htmlFor="code"
          className="block text-xs font-semibold text-slate-700 mb-1.5 font-ethiopic flex items-center gap-1.5"
        >
          <User size={14} className="text-slate-500" />
          {am.login.employeeCode}
        </label>
        <div className="relative">
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={am.login.employeeCodePlaceholder}
            autoCapitalize="characters"
            autoComplete="username"
            required
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 text-base font-semibold tracking-wider text-center uppercase bg-slate-50/50 hover:bg-white focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* PIN */}
      <div>
        <label
          htmlFor="pin"
          className="block text-xs font-semibold text-slate-700 mb-1.5 font-ethiopic flex items-center gap-1.5"
        >
          <Lock size={14} className="text-slate-500" />
          {am.login.pin}
        </label>
        <div className="relative flex items-center">
          <input
            id="pin"
            type={showPin ? "text" : "password"}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder={am.login.pinPlaceholder}
            autoComplete="current-password"
            required
            className="w-full px-12 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 text-2xl font-bold tracking-[0.4em] text-center bg-slate-50/50 hover:bg-white focus:bg-white transition-all font-mono"
          />
          <button
            type="button"
            onClick={() => setShowPin((prev) => !prev)}
            aria-label={showPin ? "Hide PIN" : "Show PIN"}
            className="absolute right-3.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs text-center font-ethiopic animate-in fade-in duration-200 flex items-center justify-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !code || !pin}
        className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-base shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-ethiopic flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>በማረጋገጥ ላይ...</span>
          </>
        ) : (
          <span>{am.login.signIn}</span>
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  const [imgError, setImgError] = useState(false);
  // Add timestamp to bust cache on every load
  const [imgSrc] = useState("/ahalogo.png?t=" + Date.now());

  const handleImageError = () => {
    console.error("Failed to load image:", imgSrc);
    setImgError(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 relative overflow-hidden px-4 py-8">
      {/* Subtle Tailor Grid & Light Effects */}
      <div className="absolute inset-0 stitch-pattern opacity-10 pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white shadow-xl shadow-blue-500/20 mb-4 ring-4 ring-white/10 overflow-hidden">
            {!imgError ? (
              <img 
                src={imgSrc}
                alt="AHA GARMENT" 
                className="w-full h-full object-cover"
                loading="eager"
                onError={handleImageError}
                key={imgSrc} // Force re-render on src change
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-bold text-2xl">
                AHA
              </div>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            AHA GARMENT
          </h1>
          <p className="text-slate-400 mt-1 text-sm font-ethiopic">
            የስፌት፣ የቆረጣ፣ የጥራትና የኢንሴንቲቭ አስተዳደር መተግበሪያ
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 sm:p-10 transition-all">
          <div className="flex items-center justify-center gap-2 mb-6 text-center">
            <Lock size={18} className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900 font-ethiopic">
              {am.login.title}
            </h2>
          </div>

          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-blue-600" />
            </div>
          }>
            <LoginForm />
          </Suspense>

          {/* Quick Helper hint */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-ethiopic">
            <span className="flex items-center gap-1 text-slate-400">
              <CheckCircle2 size={13} className="text-emerald-500" />
              የተጠበቀ የውስጥ ሥርዓት
            </span>
            <span className="text-slate-400">v1.0 (AHA GARMENT)</span>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6 font-ethiopic">
          © {new Date().getFullYear()} AHA GARMENT ERP · መብቱ በሕግ የተጠበቀ ነው
        </p>
      </div>
    </div>
  );
}
