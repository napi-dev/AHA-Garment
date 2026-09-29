import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { HourlyCountForm } from "./hourly-count-form";
import { Clock, Lock, ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { getEffectiveDate } from "@/lib/date-override/effective-date";

export default async function CountEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { role, employeeId } = session.user;
  requirePermission(role, "counts:enter");

  const today = await getEffectiveDate();
  today.setUTCHours(0, 0, 0, 0);

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

  const isOperator = role === "OPERATOR";
  const params = await searchParams;

  // Operators: scoped to their own department only
  if (isOperator && employeeId) {
    const emp = await db.employee.findUnique({
      where: { id: employeeId },
      include: { department: true },
    });
    const dept = emp?.department;
    if (!dept) {
      return (
        <div className="max-w-lg mx-auto mt-16 text-center erp-card p-10">
          <p className="font-ethiopic text-slate-500">ለዚህ ሠራተኛ ክፍል አልተገኘም።</p>
        </div>
      );
    }

    const [employees, card] = await Promise.all([
      db.employee.findMany({
        where: { departmentId: dept.id, isActive: true },
        include: {
          hourlyCounts: {
            where: { sheet: { date: today }, departmentId: dept.id },
            take: 1,
          },
        },
        orderBy: { serialNumber: "asc" },
      }),
      db.incentiveCard.findFirst({
        where: {
          departmentId: dept.id,
          effectiveFrom: { lte: today },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
        },
        orderBy: { effectiveFrom: "desc" },
      }),
    ]);

    return (
      <div className="space-y-6">
        <PageHeader />
        <HourlyCountForm
          deptWithEmployees={[{
            deptId: dept.id,
            deptNameAm: dept.nameAm,
            targetPerHour: card?.targetPerHour ?? 0,
            employees: employees.map((e) => ({
              id: e.id,
              serialNumber: e.serialNumber,
              nameAm: e.nameAm,
              existingLine: e.hourlyCounts[0] ?? null,
            })),
          }]}
          date={today.toISOString()}
          supervisorId={session.user.id}
        />
      </div>
    );
  }

  // Managers: department selector — load all depts for the selector (names only)
  const allDepts = await db.department.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, nameAm: true },
  });

  const selectedDeptId = params.dept ?? allDepts[0]?.id ?? "";

  // Load only the selected department's data
  const [employees, card] = selectedDeptId
    ? await Promise.all([
        db.employee.findMany({
          where: { departmentId: selectedDeptId, isActive: true },
          include: {
            hourlyCounts: {
              where: { sheet: { date: today }, departmentId: selectedDeptId },
              take: 1,
            },
          },
          orderBy: { serialNumber: "asc" },
        }),
        db.incentiveCard.findFirst({
          where: {
            departmentId: selectedDeptId,
            effectiveFrom: { lte: today },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
          },
          orderBy: { effectiveFrom: "desc" },
        }),
      ])
    : [[], null];

  const selectedDept = allDepts.find((d) => d.id === selectedDeptId);

  return (
    <div className="space-y-6">
      <PageHeader />

      {/* Department selector */}
      <div className="erp-card p-4">
        <form method="GET" className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 font-ethiopic">
            <Building2 size={14} className="text-blue-500" />
            <span>የስራ ክፍል ምረጥ፦</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allDepts.map((d) => (
              <button
                key={d.id}
                type="submit"
                name="dept"
                value={d.id}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-ethiopic transition-colors ${
                  d.id === selectedDeptId
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {d.nameAm}
              </button>
            ))}
          </div>
        </form>
      </div>

      <HourlyCountForm
        deptWithEmployees={selectedDept ? [{
          deptId: selectedDept.id,
          deptNameAm: selectedDept.nameAm,
          targetPerHour: card?.targetPerHour ?? 0,
          employees: (employees as Awaited<ReturnType<typeof db.employee.findMany>>).map((e) => ({
            id: e.id,
            serialNumber: e.serialNumber,
            nameAm: e.nameAm,
            existingLine: (e as { hourlyCounts?: unknown[] }).hourlyCounts?.[0] ?? null,
          })),
        }] : []}
        date={today.toISOString()}
        supervisorId={session.user.id}
      />
    </div>
  );
}

function PageHeader() {
  return (
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
  );
}
