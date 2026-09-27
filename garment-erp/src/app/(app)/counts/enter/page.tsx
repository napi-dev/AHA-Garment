import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { HourlyCountForm } from "./hourly-count-form";
import { Clock, Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";

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
        <div className="erp-card p-10 space-y-4 border-purple-200 bg-gradient-to-b from-purple-50/50 to-white">
          <div className="w-16 h-16 rounded-3xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto shadow-sm">
            <Lock size={30} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 font-ethiopic">
            {am.counts.dayAlreadyClosed}
          </h2>
          <p className="text-slate-600 font-ethiopic text-sm max-w-sm mx-auto leading-relaxed">
            የዕለቱ የምርት ሥራ ተጠቃልሎ ተዘግቷል። ተጨማሪ ቁጥር ለማስገባት ሱፐርቫይዘሩ ወይም ዋና ሥራ አስኪያጁ ቀኑን መክፈት አለባቸው።
          </p>
          <div className="pt-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-xs font-ethiopic hover:bg-purple-700 transition-colors shadow-sm"
            >
              <ArrowLeft size={14} />
              <span>ወደ ዳሽቦርድ ተመለስ</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Load departments the operator can enter for
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
      <div className="erp-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
            <Clock size={14} />
            <span>ዕለታዊ የምርት ቁጥር</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
            {am.counts.title}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-ethiopic">
            የእያንዳንዱን የስፌትና ምርት ሠራተኛ የሰዓት ውጤት እዚህ ይመዝግቡ
          </p>
        </div>
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
