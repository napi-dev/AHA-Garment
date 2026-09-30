import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { ethMonthName } from "@/lib/ethiopian-calendar";
import { getEffectiveDate, getEffectiveEthDate } from "@/lib/date-override/effective-date";
import Link from "next/link";
import { approveSalarySchedule } from "./actions";
import { Banknote, ShieldCheck, Users, Calendar, AlertCircle, Edit3 } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 20;

export default async function SalaryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; dept?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "salary:view");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const today = await getEffectiveDate();
  const ethToday = await getEffectiveEthDate();

  const where = {
    isActive: true,
    ...(params.dept ? { departmentId: params.dept } : {}),
  };

  const [employees, totalCount, departments, totals] = await Promise.all([
    db.employee.findMany({
      where,
      include: {
        department: true,
        salaryRecords: {
          where: { effectiveTo: null },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
        },
      },
      orderBy: [{ department: { sortOrder: "asc" } }, { serialNumber: "asc" }],
      skip,
      take: PAGE_SIZE,
    }),
    db.employee.count({ where }),
    db.department.findMany({ orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }], select: { id: true, nameAm: true, isActive: true } }),
    // aggregate totals separately
    db.salaryRecord.aggregate({
      where: { effectiveTo: null, employee: { isActive: true } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const canEdit = session.user.role === "ADMIN" || session.user.role === "SUPER_MANAGER";
  const canApprove = session.user.role === "SUPER_MANAGER";

  const totalSalary = Number(totals._sum.amount ?? 0);
  const missingSalariesCount = totalCount - (totals._count._all ?? 0);
  const avgSalary = totals._count._all > 0 ? totalSalary / totals._count._all : 0;

  const approveAction = approveSalarySchedule.bind(null, ethToday.year, ethToday.month);

  function buildHref(p: number) {
    const sp = new URLSearchParams();
    if (params.dept) sp.set("dept", params.dept);
    sp.set("page", String(p));
    return `/salary?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="erp-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider font-ethiopic">
            <Banknote size={14} />
            <span>የቋሚ ደሞዝ አስተዳደር</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
            {am.salary.schedule}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-ethiopic flex items-center gap-2">
            <Calendar size={14} className="text-slate-400" />
            <span>የ{ethMonthName(ethToday.month)} {ethToday.year} ዓ.ም የክፍያ ሰሌዳ</span>
          </p>
        </div>

        {canApprove && (
          <form action={approveAction}>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 font-ethiopic"
            >
              <ShieldCheck size={16} />
              <span>{am.salary.approveSchedule}</span>
            </button>
          </form>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">የሠራተኞች ብዛት</p>
            <Users size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">
            {employees.length.toLocaleString()}
          </p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">ጠቅላላ ወርሃዊ በጀት</p>
            <Banknote size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums">
            {totalSalary.toLocaleString("en-ET", { minimumFractionDigits: 2 })} <span className="text-xs font-normal">ብር</span>
          </p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">አማካይ ደሞዝ</p>
            <Banknote size={16} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-indigo-700 tabular-nums">
            {avgSalary.toLocaleString("en-ET", { minimumFractionDigits: 2 })} <span className="text-xs font-normal">ብር</span>
          </p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">ደሞዝ ያልተመደበላቸው</p>
            <AlertCircle size={16} className={missingSalariesCount > 0 ? "text-amber-500" : "text-slate-400"} />
          </div>
          <p className={`text-2xl font-bold tabular-nums ${missingSalariesCount > 0 ? "text-amber-600" : "text-slate-400"}`}>
            {missingSalariesCount}
          </p>
        </div>
      </div>

      {/* Department filter */}
      <div className="erp-card p-4">
        <form method="GET" className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-600 font-ethiopic">የስራ ክፍል፦</span>
          <select
            name="dept"
            defaultValue={params.dept ?? ""}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-ethiopic focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">ሁሉም ክፍሎች</option>
            <optgroup label="── የምርት ክፍሎች ──">
              {departments.filter((d) => d.isActive).map((d) => (
                <option key={d.id} value={d.id}>{d.nameAm}</option>
              ))}
            </optgroup>
            <optgroup label="── ቁጥጥርና አስተዳደር ──">
              {departments.filter((d) => !d.isActive).map((d) => (
                <option key={d.id} value={d.id}>{d.nameAm}</option>
              ))}
            </optgroup>
          </select>
          <button type="submit" className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-ethiopic hover:bg-slate-200 transition-colors font-semibold">
            ፈልግ
          </button>
          {params.dept && (
            <a href="/salary" className="text-xs text-slate-500 hover:text-slate-800 font-ethiopic px-2">ሁሉም</a>
          )}
        </form>
      </div>

      {/* Salary Table */}
      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead>
              <tr>
                <th className="w-12 text-center">{am.serialNumber}</th>
                <th className="text-right">{am.employees.name}</th>
                <th className="text-right">{am.employees.department}</th>
                <th className="text-right">{am.salary.fixedSalary}</th>
                {canEdit && <th className="w-24 text-center">{am.actions}</th>}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => {
                const salRec = emp.salaryRecords[0];
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="text-center tabular-nums text-slate-400 py-3">{idx + 1}</td>
                    <td className="font-ethiopic font-medium text-slate-900 text-right py-3">
                      <div>{emp.nameAm}</div>
                      <div className="text-xs font-mono text-slate-400">
                        {emp.employeeCode ?? emp.serialNumber}
                      </div>
                    </td>
                    <td className="font-ethiopic text-slate-600 text-right py-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                        {emp.department.nameAm}
                      </span>
                    </td>
                    <td className="tabular-nums font-semibold text-right py-3">
                      {salRec ? (
                        <span className="text-slate-800">
                          {Number(salRec.amount).toLocaleString("en-ET", { minimumFractionDigits: 2 })} ብር
                        </span>
                      ) : (
                        <span className="text-amber-600 font-ethiopic text-xs bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                          አልተመደበም
                        </span>
                      )}
                    </td>
                    <td className="text-center tabular-nums text-slate-600 font-medium py-3">
                      —
                    </td>
                    {canEdit && (
                      <td className="text-center py-3">
                        <Link
                          href={`/employees/${emp.id}/salary`}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-ethiopic hover:underline"
                        >
                          <Edit3 size={13} />
                          <span>{am.edit}</span>
                        </Link>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                <td colSpan={3} className="p-4 text-right font-ethiopic text-slate-800 text-base">
                  {am.total} ወርሃዊ የደሞዝ ድምር፦
                </td>
                <td className="p-4 text-right tabular-nums text-emerald-700 text-base">
                  {totalSalary.toLocaleString("en-ET", { minimumFractionDigits: 2 })} ብር
                </td>
                <td colSpan={canEdit ? 2 : 1}></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 font-ethiopic">
          ከ {totalCount} ሠራተኞች ውስጥ {employees.length} ቀርበዋል
        </div>
        <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
      </div>
    </div>
  );
}
