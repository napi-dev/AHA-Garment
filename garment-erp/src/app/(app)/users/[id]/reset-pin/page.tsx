import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { resetPin } from "../../actions";
import Link from "next/link";
import { KeyRound, ArrowLeft, AlertTriangle, ShieldCheck } from "lucide-react";

export default async function ResetPinPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const user = await db.appUser.findUnique({
    where: { id },
    include: { employee: { select: { nameAm: true, serialNumber: true } } },
  });
  if (!user) notFound();

  const action = resetPin.bind(null, id);

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/users"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 font-ethiopic"
        >
          <ArrowLeft size={14} />
          <span>ወደ ተጠቃሚዎች ዝርዝር ተመለስ</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="erp-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 uppercase tracking-wider font-ethiopic">
          <KeyRound size={14} />
          <span>የይለፍ ቃል አስተዳደር</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          {am.users.resetPin}
        </h1>
        <p className="text-slate-500 font-ethiopic text-sm mt-0.5">
          ለተጠቃሚ፦ <span className="font-mono font-bold text-slate-800">{user.employeeCode}</span>
          {user.employee && (
            <span> &nbsp;·&nbsp; {user.employee.nameAm} (#{user.employee.serialNumber})</span>
          )}
        </p>
      </div>

      {/* Form Card */}
      <form action={action} className="erp-card p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2 font-ethiopic text-center">
            {am.users.newPin} *
          </label>
          <input
            name="newPin"
            type="password"
            inputMode="numeric"
            minLength={4}
            maxLength={6}
            required
            placeholder="••••"
            className="input-field tracking-[0.5em] text-center text-3xl font-bold py-3.5"
            autoFocus
          />
        </div>

        <div className="alert-warning flex items-start gap-2.5">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 font-ethiopic leading-relaxed">
            {am.users.resetWarning}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="btn-primary flex-1 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
          >
            <KeyRound size={16} />
            <span>{am.users.confirmResetPin}</span>
          </button>
          <Link
            href="/users"
            className="btn-secondary flex-1 py-3 text-center"
          >
            {am.cancel}
          </Link>
        </div>
      </form>
    </div>
  );
}
