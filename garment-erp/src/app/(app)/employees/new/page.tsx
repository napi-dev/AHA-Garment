import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { createEmployee } from "../actions";
import Link from "next/link";
import { UserPlus, ArrowRight, UserCheck, Building2 } from "lucide-react";

export default async function NewEmployeePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "employees:edit");

  const departments = await db.department.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Top Navigation Link */}
      <div>
        <Link
          href="/employees"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors font-ethiopic"
        >
          <ArrowRight size={14} className="rotate-180" />
          <span>ወደ ሠራተኞች ዝርዝር ተመለስ</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="erp-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
          <UserPlus size={14} />
          <span>የሰው ኃይል ምዝገባ</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          {am.employees.addEmployee}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5 font-ethiopic">
          አዲስ ሠራተኛ ወደ ፋብሪካው የመረጃ ቋት ለማስገባት ቅጹን በጥንቃቄ ይሙሉ
        </p>
      </div>

      {/* Form Card */}
      <form action={createEmployee} className="erp-card p-6 md:p-8 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.employees.name} (በአማርኛ) <span className="text-rose-500">*</span>
          </label>
          <input
            name="nameAm"
            required
            className="input-field font-ethiopic"
            placeholder="ምሳሌ፦ አበባየሁ በቀለ"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            English Name (ስም በእንግሊዝኛ - አማራጭ)
          </label>
          <input
            name="nameEn"
            className="input-field"
            placeholder="e.g. Abebayehu Bekele"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.employees.department} <span className="text-rose-500">*</span>
          </label>
          <select
            name="departmentId"
            required
            className="input-field font-ethiopic text-slate-800"
          >
            <option value="">የሥራ ክፍል ይምረጡ</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nameAm}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-4 flex items-center gap-3">
          <button type="submit" className="btn-primary flex-1 font-ethiopic">
            <UserCheck size={16} />
            <span>{am.save}</span>
          </button>
          <Link
            href="/employees"
            className="btn-secondary px-6 font-ethiopic text-center"
          >
            {am.cancel}
          </Link>
        </div>
      </form>
    </div>
  );
}
