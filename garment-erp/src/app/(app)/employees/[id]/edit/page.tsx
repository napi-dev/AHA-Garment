import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission, canViewSalary } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { updateEmployee } from "../../actions";
import Link from "next/link";
import { Edit3, ArrowRight, Save, Banknote, ShieldAlert, CheckCircle2, User } from "lucide-react";

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "employees:edit");

  const { id } = await params;
  const emp = await db.employee.findUnique({
    where: { id },
    include: { department: true },
  });
  if (!emp) notFound();

  const departments = await db.department.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const action = updateEmployee.bind(null, id);
  const userCanViewSalary = canViewSalary(session.user.role);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Top Navigation Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/employees"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors font-ethiopic"
        >
          <ArrowRight size={14} className="rotate-180" />
          <span>ወደ ሠራተኞች ዝርዝር ተመለስ</span>
        </Link>
        <div className="flex items-center gap-2">
          {userCanViewSalary && (
            <Link
              href={`/employees/${id}/salary`}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl font-ethiopic hover:bg-emerald-100 transition-colors"
            >
              <Banknote size={14} />
              <span>{am.salary.title}</span>
            </Link>
          )}
          <Link
            href={`/employees/${id}/offences`}
            className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-xl font-ethiopic hover:bg-amber-100 transition-colors"
          >
            <ShieldAlert size={14} />
            <span>{am.offences.title}</span>
          </Link>
        </div>
      </div>

      {/* Header Card */}
      <div className="erp-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
          <Edit3 size={14} />
          <span>የሠራተኛ መረጃ ማሻሻያ</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          {emp.nameAm}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5 font-ethiopic flex items-center gap-2">
          <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
            {emp.employeeCode ?? emp.serialNumber}
          </span>
          <span>·</span>
          <span>{emp.department.nameAm}</span>
        </p>
      </div>

      {/* Form Card */}
      <form action={action} className="erp-card p-6 md:p-8 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.employees.name} (በአማርኛ) <span className="text-rose-500">*</span>
          </label>
          <input
            name="nameAm"
            defaultValue={emp.nameAm}
            required
            className="input-field font-ethiopic"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            English Name (ስም በእንግሊዝኛ)
          </label>
          <input
            name="nameEn"
            defaultValue={emp.nameEn ?? ""}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.employees.department} <span className="text-rose-500">*</span>
          </label>
          <select
            name="departmentId"
            defaultValue={emp.departmentId}
            required
            className="input-field font-ethiopic text-slate-800"
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nameAm}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.employees.status} <span className="text-rose-500">*</span>
          </label>
          <select
            name="isActive"
            defaultValue={String(emp.isActive)}
            className="input-field font-ethiopic text-slate-800"
          >
            <option value="true">{am.employees.active}</option>
            <option value="false">{am.employees.inactive}</option>
          </select>
        </div>

        <div className="pt-4 flex items-center gap-3">
          <button type="submit" className="btn-primary flex-1 font-ethiopic">
            <Save size={16} />
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
