import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import Link from "next/link";
import { canViewSalary } from "@/lib/auth/permissions";
import { UserPlus } from "lucide-react";
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

  const employees = await db.employee.findMany({
    where: {
      isActive: activeFilter,
      ...(params.dept ? { departmentId: params.dept } : {}),
      ...(params.q
        ? { OR: [{ nameAm: { contains: params.q } }, { nameEn: { contains: params.q } }] }
        : {}),
    },
    include: { department: true },
    orderBy: [{ department: { sortOrder: "asc" } }, { serialNumber: "asc" }],
  });

  const departments = await db.department.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const canEdit = session.user.role === "ADMIN" ||
    session.user.role === "SUPER_MANAGER" ||
    session.user.role === "HR_CLERK";
  const canDelete = session.user.role === "ADMIN" || session.user.role === "SUPER_MANAGER";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{am.employees.title}</h1>
        {canEdit && (
          <Link
            href="/employees/new"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors font-ethiopic"
          >
            <UserPlus size={16} />
            {am.employees.addEmployee}
          </Link>
        )}
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={params.q}
          placeholder={am.search}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-ethiopic w-48"
        />
        <select
          name="dept"
          defaultValue={params.dept ?? ""}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-ethiopic"
        >
          <option value="">ሁሉም ክፍሎች</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.nameAm}</option>
          ))}
        </select>
        <select
          name="active"
          defaultValue={String(activeFilter)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-ethiopic"
        >
          <option value="true">{am.employees.active}</option>
          <option value="false">{am.employees.inactive}</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 font-ethiopic"
        >
          {am.filter}
        </button>
      </form>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm data-table">
          <thead>
            <tr>
              <th className="w-12">{am.serialNumber}</th>
              <th>{am.employees.name}</th>
              <th>{am.employees.department}</th>
              {canEdit && <th className="w-36">{am.actions}</th>}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-gray-400 py-12 font-ethiopic">
                  {am.employees.noEmployees}
                </td>
              </tr>
            )}
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td className="text-center tabular-nums text-gray-500 font-mono text-xs">
                  {emp.employeeCode ?? "—"}
                </td>
                <td className="font-ethiopic text-gray-800 font-medium">{emp.nameAm}</td>
                <td className="font-ethiopic text-gray-600">{emp.department.nameAm}</td>
                {canEdit && (
                  <td>
                    <div className="flex gap-2 justify-center items-center">
                      <Link
                        href={`/employees/${emp.id}/edit`}
                        className="text-xs text-blue-600 hover:underline font-ethiopic"
                      >
                        {am.edit}
                      </Link>
                      {canDelete && (
                        <Link
                          href={`/employees/${emp.id}/salary`}
                          className="text-xs text-green-600 hover:underline font-ethiopic"
                        >
                          {am.salary.title}
                        </Link>
                      )}
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
        <div className="px-5 py-2 text-xs text-gray-400 border-t border-gray-100 font-ethiopic">
          {employees.length} ሠራተኞች
        </div>
      </div>
    </div>
  );
}
