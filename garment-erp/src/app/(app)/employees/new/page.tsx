import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { createEmployee } from "../actions";

export default async function NewEmployeePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "employees:edit");

  const departments = await db.department.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{am.employees.addEmployee}</h1>

      <form action={createEmployee} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">
            {am.employees.name} <span className="text-red-500">*</span>
          </label>
          <input
            name="nameAm"
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-ethiopic"
            placeholder="ሙሉ ስም"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">English name (optional)</label>
          <input
            name="nameEn"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">
            {am.employees.department} <span className="text-red-500">*</span>
          </label>
          <select
            name="departmentId"
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-ethiopic"
          >
            <option value="">ክፍል ምረጥ</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.nameAm}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-ethiopic font-semibold hover:bg-blue-700 transition-colors"
          >
            {am.save}
          </button>
          <a
            href="/employees"
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-ethiopic font-semibold text-center hover:bg-gray-200 transition-colors"
          >
            {am.cancel}
          </a>
        </div>
      </form>
    </div>
  );
}
