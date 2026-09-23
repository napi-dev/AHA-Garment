"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";

export async function saveAttendance(input: {
  date: string;
  employeeId: string;
  hoursWorked: number;
  lineId: string | null;
  enteredById: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "attendance:edit");

  const date = new Date(input.date + "T00:00:00Z");

  await db.attendance.upsert({
    where: { employeeId_date: { employeeId: input.employeeId, date } },
    update: { hoursWorked: input.hoursWorked, lineId: input.lineId, enteredById: input.enteredById },
    create: {
      employeeId: input.employeeId,
      date,
      hoursWorked: input.hoursWorked,
      lineId: input.lineId,
      enteredById: input.enteredById,
    },
  });

  revalidatePath("/attendance");
}

export async function bulkAttendance(input: {
  date: string;
  employeeIds: string[];
  hoursWorked: number;
  enteredById: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "attendance:edit");

  const date = new Date(input.date + "T00:00:00Z");

  await Promise.all(
    input.employeeIds.map((empId) =>
      db.attendance.upsert({
        where: { employeeId_date: { employeeId: empId, date } },
        update: { hoursWorked: input.hoursWorked, enteredById: input.enteredById },
        create: {
          employeeId: empId,
          date,
          hoursWorked: input.hoursWorked,
          enteredById: input.enteredById,
        },
      })
    )
  );

  revalidatePath("/attendance");
}
