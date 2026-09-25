import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import { AttendanceGrid } from "./attendance-grid";
import { DatePicker } from "./date-picker";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "attendance:view");

  const params = await searchParams;
  const dateStr = params.date ?? new Date().toISOString().split("T")[0];
  const date = new Date(dateStr + "T00:00:00Z");

  const departments = await db.department.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      employees: {
        where: { isActive: true },
        orderBy: { serialNumber: "asc" },
        include: {
          attendances: {
            where: { date },
          },
        },
      },
    },
  });

  const canEdit = session.user.role === "ADMIN" ||
    session.user.role === "SUPER_MANAGER" ||
    session.user.role === "HR_CLERK";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">
            {am.attendance.title}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5 font-ethiopic">
            {formatAsEthDate(date)}
          </p>
        </div>
        {/* Date picker — wrapped in client island */}
        <DatePicker defaultValue={dateStr} />
      </div>

      <AttendanceGrid
        departments={departments.map((d) => ({
          id: d.id,
          nameAm: d.nameAm,
          employees: d.employees.map((e) => ({
            id: e.id,
            serialNumber: e.serialNumber,
            nameAm: e.nameAm,
            attendance: e.attendances[0]
              ? {
                  id: e.attendances[0].id,
                  hoursWorked: Number(e.attendances[0].hoursWorked),
                  lineId: e.attendances[0].lineId ?? "",
                }
              : null,
          })),
        }))}
        date={dateStr}
        canEdit={canEdit}
        userId={session.user.id}
      />
    </div>
  );
}
