import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission, canViewSalary } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import Link from "next/link";
import { Users, UserPlus, Search, Filter, ShieldAlert, Banknote, Edit3, CheckCircle2, XCircle, Building2 } from "lucide-react";
import { DeleteEmployeeButton } from "./delete-button";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string; q?: string; active?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "employees:view");

  const params = await searchParams;
  const activeFilter = params.active !== "false";

  const [employees, departments, totalActive, totalInactive] = await Promise.all([
    db.employee.findMany({
      where: {
        isActive: activeFilter,
        ...(params.dept ? { departmentId: params.dept } : {}),
        ...(params.q
          ? { OR: [{ nameAm: { contains: params.q } }, { nameEn: { contains: params.q } }, { employeeCode: { contains: params.q.toUpperCase() } }] }
          : {}),
      },
      include: {
        department: true,
        _count: { select: { offences: true } },
      },
      orderBy: [{ department: { sortOrder: "asc" } }, { serialNumber: "asc" }],
    }),
    db.department.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.employee.count({ where: { isActive: true } }),
    db.employee.count({ where: { isActive: false } }),
  ]);

  const canEdit =
    session.user.role === "ADMIN" ||
    session.user.role === "SUPER_MANAGER" ||
    session.user.role === "HR_CLERK";
  const canDelete = session.user.role === "ADMIN" || session.user.role === "SUPER_MANAGER";
  const userCanViewSalary = canViewSalary(session.user.role);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="erp-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
            <Users size={14} />
            <span>የሰው ኃይል አስተዳደር (HR)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
            {am.employees.title}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-ethiopic flex items-center gap-2">
            <span>በስርዓቱ ውስጥ የተመዘገቡ {totalActive} ንቁ ሠራተኞች እና {departments.length} የሥራ ክፍሎች አሉ</span>
          </p>
        </div>

        {canEdit && (
          <Link
            href="/employees/new"
            className="btn-primary flex items-center gap-2 font-ethiopic"
          >
            <UserPlus size={16} />
            <span>{am.employees.addEmployee}</span>
          </Link>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">ንቁ ሠራተኞች</p>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{totalActive.toLocaleString()}</p>
        </div>
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">የታገዱ / የወጡ</p>
            <XCircle size={16} className="text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{totalInactive.toLocaleString()}</p>
        </div>
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">የሥራ ክፍሎች</p>
            <Building2 size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{departments.length}</p>
        </div>
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">የተጣሩ ሠራተኞች</p>
            <Filter size={16} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-indigo-700 tabular-nums">{employees.length.toLocaleString()}</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="erp-card p-4">
        <form method="GET" className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={params.q}
              placeholder="በስም ወይም በመለያ ኮድ ፈልግ..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-ethiopic placeholder:text-slate-400"
            />
          </div>

          <div className="min-w-[180px]">
            <select
              name="dept"
              defaultValue={params.dept ?? ""}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-ethiopic text-slate-700"
            >
              <option value="">ሁሉም የስራ ክፍሎች</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nameAm}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[140px]">
            <select
              name="active"
              defaultValue={String(activeFilter)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-ethiopic text-slate-700"
            >
              <option value="true">{am.employees.active}</option>
              <option value="false">{am.employees.inactive}</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn-secondary flex items-center gap-2"
          >
            <Filter size={15} />
            <span>{am.filter}</span>
          </button>

          {(params.q || params.dept || params.active === "false") && (
            <Link
              href="/employees"
              className="text-xs text-slate-500 hover:text-slate-800 font-ethiopic px-2 py-1"
            >
              ማጣሪያዎችን አፅዳ
            </Link>
          )}
        </form>
      </div>

      {/* Main Table Card */}
      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead>
              <tr>
                <th className="w-16 text-center">መለያ</th>
                <th className="text-right">{am.employees.name}</th>
                <th className="text-right">{am.employees.department}</th>
                <th className="w-24 text-center">{am.status}</th>
                <th className="w-28 text-center">ጥፋቶች</th>
                {canEdit && <th className="w-48 text-center">{am.actions}</th>}
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-slate-400 py-16 font-ethiopic">
                    <Users size={36} className="mx-auto mb-2 text-slate-300" />
                    <p>{am.employees.noEmployees}</p>
                  </td>
                </tr>
              )}
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="text-center font-mono text-xs font-semibold text-slate-600 bg-slate-50/50 py-3">
                    {emp.employeeCode ?? emp.serialNumber}
                  </td>
                  <td className="font-ethiopic text-slate-900 font-medium text-right py-3">
                    <div>{emp.nameAm}</div>
                    {emp.nameEn && (
                      <div className="text-xs text-slate-400 font-sans">{emp.nameEn}</div>
                    )}
                  </td>
                  <td className="font-ethiopic text-slate-600 text-right py-3">
                    <span className="inline-block bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-lg">
                      {emp.department.nameAm}
                    </span>
                  </td>
                  <td className="text-center py-3">
                    {emp.isActive ? (
                      <span className="badge-verified">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {am.employees.active}
                      </span>
                    ) : (
                      <span className="badge-danger">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        {am.employees.inactive}
                      </span>
                    )}
                  </td>
                  <td className="text-center py-3">
                    {emp._count.offences > 0 ? (
                      <Link
                        href={`/employees/${emp.id}/offences`}
                        className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full font-ethiopic hover:bg-amber-100 transition-colors"
                      >
                        <ShieldAlert size={12} className="text-amber-600" />
                        <span>{emp._count.offences} ጥፋት</span>
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400 font-ethiopic">—</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="text-center py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/employees/${emp.id}/edit`}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title={am.edit}
                        >
                          <Edit3 size={15} />
                        </Link>
                        {userCanViewSalary && (
                          <Link
                            href={`/employees/${emp.id}/salary`}
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title={am.salary.title}
                          >
                            <Banknote size={15} />
                          </Link>
                        )}
                        <Link
                          href={`/employees/${emp.id}/offences`}
                          className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title={am.offences.title}
                        >
                          <ShieldAlert size={15} />
                        </Link>
                        {canDelete && (
                          <DeleteEmployeeButton empId={emp.id} nameAm={emp.nameAm} />
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 font-ethiopic flex justify-between items-center">
          <span>በዚህ ገጽ ላይ {employees.length} ሠራተኞች ይታያሉ</span>
          <span>ጠቅላላ የፋብሪካው ሠራተኛ፦ {totalActive + totalInactive}</span>
        </div>
      </div>
    </div>
  );
}
