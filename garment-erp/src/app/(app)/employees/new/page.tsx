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
        <Field label={am.employees.name} required>
          <input name="nameAm" required className="input-base font-ethiopic" placeholder="ሙሉ ስም" />
        </Field>
        <Field label="English name (optional)">
          <input name="nameEn" className="input-base" placeholder="Full name" />
        </Field>
        <Field label={am.employees.department} required>
          <select name="departmentId" required className="input-base font-ethiopic">
            <option value="">ክፍል ምረጥ</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.nameAm}</option>
            ))}
          </select>
        </Field>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-medium text-gray-700 mb-3 font-ethiopic">ሎጊን ፍጠር (አማራጭ)</p>
          <input type="hidden" name="createLogin" value="true" />
          <Field label="የሠራተኛ ቁጥር (EMP-001)">
            <input name="employeeCode" className="input-base uppercase" placeholder="EMP-001" />
          </Field>
          <Field label={am.login.pin}>
            <input name="pin" type="password" inputMode="numeric" maxLength={6} className="input-base tracking-widest text-center" placeholder="••••" />
          </Field>
          <Field label="ሚና">
            <select name="role" className="input-base font-ethiopic">
              {Object.entries(am.roles).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-ethiopic font-semibold hover:bg-blue-700 transition-colors">
            {am.save}
          </button>
          <a href="/employees" className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-ethiopic font-semibold text-center hover:bg-gray-200 transition-colors">
            {am.cancel}
          </a>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
