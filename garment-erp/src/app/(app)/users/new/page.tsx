import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { createUser } from "../actions";

export default async function NewUserPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "users:manage");

  const employees = await db.employee.findMany({
    where: { isActive: true, user: null },
    include: { department: true },
    orderBy: { serialNumber: "asc" },
  });

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">ተጠቃሚ ጨምር</h1>
      <form action={createUser} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <F label="የሠራተኛ ኮድ (EMP-001) *">
          <input name="employeeCode" required placeholder="EMP-001" className="input-field uppercase font-mono" />
        </F>
        <F label="ሠራተኛ ይምረጡ (አማራጭ)">
          <select name="employeeId" className="input-field font-ethiopic">
            <option value="">— ይምረጡ —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.serialNumber}. {e.nameAm} — {e.department.nameAm}
              </option>
            ))}
          </select>
        </F>
        <F label={`${am.login.pin} (4–6 ቁጥሮች) *`}>
          <input name="pin" type="password" inputMode="numeric" minLength={4} maxLength={6}
            required placeholder="••••" className="input-field tracking-widest text-center text-2xl" />
        </F>
        <F label="ሚና *">
          <select name="role" required className="input-field font-ethiopic">
            {Object.entries(am.roles).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </F>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-ethiopic font-semibold hover:bg-blue-700">{am.save}</button>
          <a href="/users" className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-ethiopic font-semibold text-center hover:bg-gray-200">{am.cancel}</a>
        </div>
      </form>
    </div>
  );
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">{label}</label>
      {children}
    </div>
  );
}
