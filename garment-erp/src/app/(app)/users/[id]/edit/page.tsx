import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { updateUser } from "../../actions";
import Link from "next/link";
import { Shield, ArrowLeft, Save, AlertTriangle, UserCheck } from "lucide-react";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const user = await db.appUser.findUnique({
    where: { id },
    include: { employee: { select: { nameAm: true, serialNumber: true } } },
  });
  if (!user) notFound();

  const action = updateUser.bind(null, id);

  return (
    <div className="max-w-xl mx-auto space-y-6">
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
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
          <Shield size={14} />
          <span>የመለያ ማስተካከያ</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          ተጠቃሚ አስተካክል
        </h1>
        <p className="text-slate-500 font-ethiopic text-sm mt-0.5">
          መለያ ኮድ፦ <span className="font-mono font-bold text-slate-800">{user.employeeCode}</span>
          {user.employee && (
            <span> &nbsp;·&nbsp; {user.employee.nameAm} (#{user.employee.serialNumber})</span>
          )}
        </p>
      </div>

      {/* Form Card */}
      <form action={action} className="erp-card p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-ethiopic">
            {am.users.role} *
          </label>
          <select name="role" defaultValue={user.role} className="input-field font-ethiopic">
            {Object.entries(am.roles).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-ethiopic">
            {am.users.status} *
          </label>
          <select name="isActive" defaultValue={String(user.isActive)} className="input-field font-ethiopic">
            <option value="true">ንቁ ተጠቃሚ (Active)</option>
            <option value="false">የታገደ / የተዘጋ (Inactive)</option>
          </select>
        </div>

        {/* Protect the sole Production Manager and Admin */}
        {(user.role === "PRODUCTION_MANAGER" || user.role === "ADMIN") && (
          <div className="alert-warning flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-ethiopic leading-relaxed">
              ይህ ተጠቃሚ የ{am.roles[user.role]} ፈቃድ ያለው ነው። ሚናውን ሲቀይሩ በሲስተሙ ውስጥ ቢያንስ አንድ ንቁ ሱፐር ማኔጀር እና አስተዳዳሪ መኖር እንዳለበት ያረጋግጡ።
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
          <button
            type="submit"
            className="btn-primary flex-1 py-3"
          >
            <Save size={16} />
            <span>{am.save}</span>
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
