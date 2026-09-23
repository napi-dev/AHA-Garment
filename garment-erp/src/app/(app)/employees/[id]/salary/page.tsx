import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import { setSalary } from "@/app/(app)/salary/actions";

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

  const canEdit = session.user.role === "ADMIN" || session.user.role === "SUPER_MANAGER";
  const current = emp.salaryRecords[0];
  const today = new Date().toISOString().split("T")[0];

  const action = setSalary.bind(null, undefined as unknown as typeof setSalary extends (...a: infer A) => unknown ? A[0] : never);
  // Use a proper bound action below
  async function boundSetSalary(formData: FormData) {
    "use server";
    await setSalary({
      employeeId: id,
      amount: String(formData.get("amount") ?? ""),
      effectiveFrom: String(formData.get("effectiveFrom") ?? today),
    });
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{am.salary.title}</h1>
        <p className="text-gray-600 font-ethiopic">{emp.nameAm} — {emp.department.nameAm}</p>
      </div>

      {canEdit && (
        <form action={boundSetSalary} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <p className="font-medium text-gray-700 font-ethiopic">{am.salary.setSalary}</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">
              {am.salary.fixedSalary}
            </label>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={current ? String(current.amount) : ""}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">
              {am.salary.effectiveFrom}
            </label>
            <input
              name="effectiveFrom"
              type="date"
              defaultValue={today}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-ethiopic font-semibold hover:bg-blue-700 transition-colors"
          >
            {am.save}
          </button>
          {session.user.role === "ADMIN" && (
            <p className="text-xs text-amber-600 font-ethiopic">
              ⚠️ አስተዳዳሪ ደሞዝ ሲቀይር ሱፐር ማኔጀሩ ይነገራቸዋል።
            </p>
          )}
        </form>
      )}

      {/* History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700 font-ethiopic">{am.salary.salaryHistory}</h2>
        </div>
        <table className="w-full text-sm data-table">
          <thead>
            <tr>
              <th>{am.salary.fixedSalary}</th>
              <th>{am.salary.effectiveFrom}</th>
              <th>እስከ</th>
            </tr>
          </thead>
          <tbody>
            {emp.salaryRecords.length === 0 && (
              <tr><td colSpan={3} className="text-center text-gray-400 py-6 font-ethiopic">ምንም ታሪክ የለም</td></tr>
            )}
            {emp.salaryRecords.map((r) => (
              <tr key={r.id}>
                <td className="tabular-nums font-medium">
                  {Number(r.amount).toLocaleString("en-ET", { minimumFractionDigits: 2 })} ብር
                </td>
                <td>{formatAsEthDate(r.effectiveFrom)}</td>
                <td>{r.effectiveTo ? formatAsEthDate(r.effectiveTo) : <span className="text-green-600 font-ethiopic text-xs">አሁን</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
