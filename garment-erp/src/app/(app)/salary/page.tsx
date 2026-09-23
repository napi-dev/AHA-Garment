import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission, canViewSalary } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate, todayEth, ethMonthName } from "@/lib/ethiopian-calendar";
import Link from "next/link";
import { approveSalarySchedule } from "./actions";

export default async function SalaryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "salary:view");

  const today = new Date();
  const ethToday = todayEth();

  // All active employees with their current salary
  const employees = await db.employee.findMany({
    where: { isActive: true },
    include: {
      department: true,
      salaryRecords: {
        where: { effectiveTo: null },
        orderBy: { effectiveFrom: "desc" },
        take: 1,
      },
      attendances: {
        where: {
          date: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
            lte: today,
          },
          hoursWorked: { gt: 0 },
        },
      },
    },
    orderBy: [{ department: { sortOrder: "asc" } }, { serialNumber: "asc" }],
  });

  const canEdit = session.user.role === "ADMIN" || session.user.role === "SUPER_MANAGER";
  const canApprove = session.user.role === "SUPER_MANAGER";

  const totalSalary = employees.reduce((sum, e) => {
    const sal = e.salaryRecords[0];
    return sum + (sal ? Number(sal.amount) : 0);
  }, 0);

  const approveAction = approveSalarySchedule.bind(null, ethToday.year, ethToday.month);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{am.salary.schedule}</h1>
          <p className="text-gray-500 text-sm mt-0.5 font-ethiopic">
            {ethMonthName(ethToday.month)} {ethToday.year} ዓ.ም
          </p>
        </div>
        {canApprove && (
          <form action={approveAction}>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold font-ethiopic hover:bg-emerald-700 transition-colors"
            >
              {am.salary.approveSchedule}
            </button>
          </form>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <SumCard label="ሠራተኞች ቁጥር" value={String(employees.length)} />
        <SumCard label="ጠቅላላ ደሞዝ (ብር)" value={totalSalary.toLocaleString("en-ET", { minimumFractionDigits: 2 })} color="text-green-700" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm data-table">
          <thead>
            <tr>
              <th className="w-10">{am.serialNumber}</th>
              <th>{am.employees.name}</th>
              <th>{am.employees.department}</th>
              <th>{am.salary.fixedSalary}</th>
              <th>{am.salary.daysAttended}</th>
              <th className="w-20">{am.signature}</th>
              {canEdit && <th className="w-20">{am.actions}</th>}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, idx) => {
              const salRec = emp.salaryRecords[0];
              const daysAttended = emp.attendances.length;
              return (
                <tr key={emp.id}>
                  <td className="text-center tabular-nums text-gray-400">{idx + 1}</td>
                  <td className="font-ethiopic text-gray-800 font-medium">{emp.nameAm}</td>
                  <td className="font-ethiopic text-gray-600">{emp.department.nameAm}</td>
                  <td className="tabular-nums font-medium text-gray-800">
                    {salRec ? Number(salRec.amount).toLocaleString("en-ET", { minimumFractionDigits: 2 }) : (
                      <span className="text-amber-600 font-ethiopic text-xs">አልተቀመጠም</span>
                    )}
                  </td>
                  <td className="text-center tabular-nums">{daysAttended}</td>
                  <td></td>
                  {canEdit && (
                    <td>
                      <Link href={`/employees/${emp.id}/salary`}
                        className="text-xs text-blue-600 hover:underline font-ethiopic">
                        {am.edit}
                      </Link>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold">
              <td colSpan={3} className="p-3 text-right font-ethiopic text-gray-700">{am.total}</td>
              <td className="p-3 text-right tabular-nums text-gray-900">
                {totalSalary.toLocaleString("en-ET", { minimumFractionDigits: 2 })}
              </td>
              <td colSpan={canEdit ? 3 : 2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function SumCard({ label, value, color = "text-gray-800" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-500 font-ethiopic mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
