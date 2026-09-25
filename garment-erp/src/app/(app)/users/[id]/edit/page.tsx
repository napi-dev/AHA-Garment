import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { updateUser } from "../../actions";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "users:manage");

  const { id } = await params;
  const user = await db.appUser.findUnique({
    where: { id },
    include: { employee: { select: { nameAm: true } } },
  });
  if (!user) notFound();

  const action = updateUser.bind(null, id);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">ተጠቃሚ አስተካክል</h1>
      <p className="font-mono text-gray-600">{user.employeeCode} {user.employee?.nameAm ? `— ${user.employee.nameAm}` : ""}</p>
      <form action={action} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">ሚና</label>
          <select name="role" defaultValue={user.role} className="input-field font-ethiopic">
            {Object.entries(am.roles).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">ሁኔታ</label>
          <select name="isActive" defaultValue={String(user.isActive)} className="input-field font-ethiopic">
            <option value="true">ንቁ</option>
            <option value="false">ተዘጋ</option>
          </select>
        </div>
        {/* Protect the sole Super Manager and Admin */}
        {(user.role === "SUPER_MANAGER" || user.role === "ADMIN") && (
          <p className="text-xs text-amber-600 font-ethiopic bg-amber-50 rounded-xl p-3">
            ⚠️ ይህ ሱፐር ማኔጀር ወይም አስተዳዳሪ ሚና ተጠቃሚ ነው። ሚናውን ሲቀይሩ ሁለቱ ሚናዎች ሁልጊዜ አንድ ሰው ሊኖራቸው ያስፈልጋል።
          </p>
        )}
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-ethiopic font-semibold hover:bg-blue-700">{am.save}</button>
          <a href="/users" className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-ethiopic font-semibold text-center hover:bg-gray-200">{am.cancel}</a>
        </div>
      </form>
    </div>
  );
}
