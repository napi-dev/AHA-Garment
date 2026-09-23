import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { updateEmployee } from "../../actions";

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "employees:edit");

  const { id } = await params;
  const emp = await db.employee.findUnique({ where: { id }, include: { department: true } });
  if (!emp) notFound();

  const departments = await db.department.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const action = updateEmployee.bind(null, id);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{am.employees.editEmployee}</h1>

      <form action={action} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">{am.employees.name}</label>
          <input name="nameAm" defaultValue={emp.nameAm} required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-ethiopic" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">English name</label>
          <input name="nameEn" defaultValue={emp.nameEn ?? ""}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">{am.employees.department}</label>
          <select name="departmentId" defaultValue={emp.departmentId} required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-ethiopic">
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.nameAm}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">{am.employees.status}</label>
          <select name="isActive" defaultValue={String(emp.isActive)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-ethiopic">
            <option value="true">{am.employees.active}</option>
            <option value="false">{am.employees.inactive}</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-ethiopic font-semibold hover:bg-blue-700">
            {am.save}
          </button>
          <a href="/employees" className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-ethiopic font-semibold text-center hover:bg-gray-200">
            {am.cancel}
          </a>
        </div>
      </form>
    </div>
  );
}
