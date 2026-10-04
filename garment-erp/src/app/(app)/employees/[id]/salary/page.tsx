import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate, todayISOStringEAT } from "@/lib/ethiopian-calendar";
import { setSalary } from "@/app/(app)/salary/actions";
import Link from "next/link";
import { Banknote, ArrowRight, Save, History, AlertTriangle, CheckCircle2 } from "lucide-react";

export default async function EmployeeSalaryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "salary:view");

  const { id } = await params;
  const emp = await db.employee.findUnique({
    where: { id },
    include: {
      department: true,
      salaryRecords: { orderBy: { effectiveFrom: "desc" } },
    },
  });
  if (!emp) notFound();

  const canEdit = session.user.role === "ADMIN" || session.user.role === "PRODUCTION_MANAGER";
  const current = emp.salaryRecords[0];
  const today = todayISOStringEAT();

  async function boundSetSalary(formData: FormData) {
    "use server";
    await setSalary({
      employeeId: id,
      amount: String(formData.get("amount") ?? ""),
      effectiveFrom: String(formData.get("effectiveFrom") ?? today),
    });
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Top Navigation Link */}
      <div>
        <Link
          href={`/employees/${id}/edit`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors font-ethiopic"
        >
          <ArrowRight size={14} className="rotate-180" />
          <span>ወደ ሠራተኛው መረጃ ተመለስ</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="erp-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider font-ethiopic">
          <Banknote size={14} />
          <span>የግል ቋሚ ደሞዝ አስተዳደር</span>
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

        {current && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 font-ethiopic">ወቅታዊ ወርሃዊ ደሞዝ፦</span>
            <span className="text-xl font-bold text-emerald-700 tabular-nums font-ethiopic">
              {Number(current.amount).toLocaleString("en-ET", { minimumFractionDigits: 2 })} ብር
            </span>
          </div>
        )}
      </div>

      {/* Form Card */}
      {canEdit && (
        <form action={boundSetSalary} className="erp-card p-6 md:p-8 space-y-5">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 font-ethiopic">
            <Banknote size={16} className="text-emerald-600" />
            <span>{am.salary.setSalary}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
              {am.salary.fixedSalary} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={current ? String(current.amount) : ""}
                required
                className="input-field tabular-nums pl-4 pr-12 text-base font-semibold"
                placeholder="0.00"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400 font-ethiopic">
                ብር
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
              {am.salary.effectiveFrom} <span className="text-rose-500">*</span>
            </label>
            <input
              name="effectiveFrom"
              type="date"
              defaultValue={today}
              required
              className="input-field"
            />
          </div>

          {session.user.role === "ADMIN" && (
            <div className="alert-warning font-ethiopic text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-700 flex-shrink-0" />
              <span>አስተዳዳሪ የሠራተኛ ደሞዝ ሲቀይር ወይም ሲመድብ ለዋና ሥራ አስኪያጁ ማሳወቂያ ይላካል።</span>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full font-ethiopic mt-2"
          >
            <Save size={16} />
            <span>{am.save}</span>
          </button>
        </form>
      )}

      {/* History Card */}
      <div className="erp-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <History size={16} className="text-slate-500" />
          <h2 className="font-bold text-slate-800 text-sm font-ethiopic">
            {am.salary.salaryHistory}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead>
              <tr>
                <th className="text-right">{am.salary.fixedSalary}</th>
                <th className="text-right">{am.salary.effectiveFrom}</th>
                <th className="text-center">የማብቂያ ቀን</th>
              </tr>
            </thead>
            <tbody>
              {emp.salaryRecords.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center text-slate-400 py-8 font-ethiopic">
                    ምንም የደሞዝ ታሪክ አልተገኘም
                  </td>
                </tr>
              ) : (
                emp.salaryRecords.map((r) => (
                  <tr key={r.id}>
                    <td className="tabular-nums font-semibold text-slate-800 text-right">
                      {Number(r.amount).toLocaleString("en-ET", { minimumFractionDigits: 2 })} ብር
                    </td>
                    <td className="font-ethiopic text-slate-600 text-right">
                      {formatAsEthDate(r.effectiveFrom)}
                    </td>
                    <td className="text-center">
                      {r.effectiveTo ? (
                        <span className="font-ethiopic text-xs text-slate-500">
                          {formatAsEthDate(r.effectiveTo)}
                        </span>
                      ) : (
                        <span className="badge-verified">
                          <CheckCircle2 size={12} />
                          <span>አሁን በስራ ላይ</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
