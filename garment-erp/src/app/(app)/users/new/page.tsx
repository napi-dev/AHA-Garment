import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { createUser } from "../actions";
import Link from "next/link";
import { UserPlus, ArrowLeft, Shield, KeyRound, User, Briefcase } from "lucide-react";

export default async function NewUserPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const employees = await db.employee.findMany({
    where: { isActive: true, user: null },
    include: { department: true },
    orderBy: { serialNumber: "asc" },
  });

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
          <span>የመለያ አስተዳደር</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          {am.users.addUser}
        </h1>
        <p className="text-slate-500 font-ethiopic text-sm mt-0.5">
          ለሰራተኛ ወይም ለአስተዳዳሪ አዲስ የመግቢያ መለያና የይለፍ ፒን ይፍጠሩ
        </p>
      </div>

      {/* Form Card */}
      <form action={createUser} className="erp-card p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-ethiopic flex items-center gap-1.5">
            <User size={14} className="text-slate-400" />
            <span>የሠራተኛ ኮድ (ምሳሌ፦ EMP-001) *</span>
          </label>
          <input
            name="employeeCode"
            required
            placeholder="EMP-001"
            className="input-field uppercase font-mono font-bold tracking-wider"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-ethiopic flex items-center gap-1.5">
            <Briefcase size={14} className="text-slate-400" />
            <span>ሠራተኛ ይምረጡ (አማራጭ)</span>
          </label>
          <select name="employeeId" className="input-field font-ethiopic">
            <option value="">— ተዛማጅ ሠራተኛ ይምረጡ —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                #{e.serialNumber} · {e.nameAm} ({e.department.nameAm})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-ethiopic flex items-center gap-1.5">
            <KeyRound size={14} className="text-slate-400" />
            <span>{am.users.pin} (4–6 ቁጥሮች) *</span>
          </label>
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            minLength={4}
            maxLength={6}
            required
            placeholder="••••"
            className="input-field tracking-[0.4em] text-center text-2xl font-bold py-2.5"
          />
          <p className="text-[11px] text-slate-400 font-ethiopic mt-1">
            ተጠቃሚው ወደ ሲስተሙ ሲገባ የሚጠቀምበት ሚስጥራዊ የቁጥር ፒን
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-ethiopic flex items-center gap-1.5">
            <Shield size={14} className="text-slate-400" />
            <span>{am.users.role} *</span>
          </label>
          <select name="role" required className="input-field font-ethiopic">
            {Object.entries(am.roles).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
          <button
            type="submit"
            className="btn-primary flex-1 py-3"
          >
            <UserPlus size={16} />
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
