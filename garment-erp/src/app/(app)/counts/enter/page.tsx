import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { HourlyCountForm } from "./hourly-count-form";

export default async function CountEntryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { role, employeeId } = session.user;
  requirePermission(role, "counts:enter");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if day is already closed
  const dayClose = await db.dayClose.findUnique({ where: { date: today } });

  if (dayClose) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <div className="bg-purple-50 rounded-2xl p-8">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-xl font-bold text-purple-800 font-ethiopic mb-2">
            {am.counts.dayAlreadyClosed}
          </h2>
          <p className="text-purple-600 font-ethiopic text-sm">
            ዛሬ ቀን ተዘግቷል። ሱፐርቫይዘሩ ወይም ዋና ሥራ አስኪያጁ ካስፈለጉ ሊከፍቱ ይችላሉ።
          </p>
        </div>
      </div>
    );
  }

  // Load departments the operator can enter for
  // Operators see only their own department; managers see all
  const isOperator = role === "OPERATOR";

  let departments;
  if (isOperator && employeeId) {
    const emp = await db.employee.findUnique({
      where: { id: employeeId },
      include: { department: true },
    });
    departments = emp ? [emp.department] : [];
  } else {
    departments = await db.department.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  // Load employees per department with today's draft entries
  const deptWithEmployees = await Promise.all(
    departments.map(async (dept) => {
      const employees = await db.employee.findMany({
        where: { departmentId: dept.id, isActive: true },
        include: {
          hourlyCountLines: {
            where: { sheet: { date: today }, departmentId: dept.id },
            take: 1,
          },
        },
        orderBy: { serialNumber: "asc" },
      });

      // Get today's incentive card for this dept
      const card = await db.incentiveCard.findFirst({
        where: {
          departmentId: dept.id,
          effectiveFrom: { lte: today },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
        },
        orderBy: { effectiveFrom: "desc" },
      });

      return { dept, employees, targetPerHour: card?.targetPerHour ?? 0 };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">
          {am.counts.title}
        </h1>
        <p className="text-gray-500 text-sm mt-0.5 font-ethiopic">
          {am.counts.enterCount}
        </p>
      </div>

      <HourlyCountForm
        deptWithEmployees={deptWithEmployees.map((d) => ({
          deptId: d.dept.id,
          deptNameAm: d.dept.nameAm,
          targetPerHour: d.targetPerHour,
          employees: d.employees.map((e) => ({
            id: e.id,
            serialNumber: e.serialNumber,
            nameAm: e.nameAm,
            existingLine: e.hourlyCountLines[0] ?? null,
          })),
        }))}
        date={today.toISOString()}
        supervisorId={session.user.id}
      />
    </div>
  );
}
