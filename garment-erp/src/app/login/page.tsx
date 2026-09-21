"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { am } from "@/lib/i18n/am";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";

  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white text-2xl font-bold mb-4">
            ፋ
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">
            {am.appName}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Garment Factory System</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6 font-ethiopic text-center">
            {am.login.title}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Employee Code */}
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic"
              >
                {am.login.employeeCode}
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={am.login.employeeCodePlaceholder}
                autoCapitalize="characters"
                autoComplete="username"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg tracking-widest text-center uppercase"
              />
            </div>

            {/* PIN — large number pad feel */}
            <div>
              <label
                htmlFor="pin"
                className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic"
              >
                {am.login.pin}
              </label>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={am.login.pinPlaceholder}
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-3xl tracking-[0.5em] text-center"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-600 text-sm text-center font-ethiopic bg-red-50 rounded-lg py-2 px-3">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !code || !pin}
              className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-base
                hover:bg-blue-700 active:scale-[0.98] transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                font-ethiopic"
            >
              {loading ? "..." : am.login.signIn}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          ልብስ ፋብሪካ ሥርዓት v0.1
        </p>
      </div>
    </div>
  );
}
