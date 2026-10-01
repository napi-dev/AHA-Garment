import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { HourlyCountForm } from "./hourly-count-form";
import { DateNavigator } from "./date-navigator";
import { Clock, Lock, Building2 } from "lucide-react";
import { getEffectiveDate } from "@/lib/date-override/effective-date";

export default async function CountEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string; date?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { role, employeeId } = session.user;
  requirePermission(role, "counts:enter");

  const params = await searchParams;

  // ─── Determine selected date ───────────────────────────────────────────────
  // Use query param if provided, otherwise use effective date
  let selectedDate: Date;
  if (params.date) {
    selectedDate = new Date(params.date + "T00:00:00Z");
  } else {
    selectedDate = await getEffectiveDate();
  }
  selectedDate.setUTCHours(0, 0, 0, 0);

  const selectedDateISO = selectedDate.toISOString().split("T")[0]; // YYYY-MM-DD
  const today = await getEffectiveDate();
  const todayISO = today.toISOString().split("T")[0];
  const isToday = selectedDateISO === todayISO;

  // ─── Check if selected day is closed ────────────────────────────────────────
  const dayClose = await db.dayClose.findUnique({ where: { date: selectedDate } });
  const isDayClosed = !!dayClose;

  // ─── Operator: restrict to own department ───────────────────────────────────
  const isOperator = role === "OPERATOR";

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
            where: { sheet: { date: selectedDate }, departmentId: dept.id },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { serialNumber: "asc" },
      }),
      db.incentiveCard.findFirst({
        where: {
          departmentId: dept.id,
          effectiveFrom: { lte: selectedDate },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: selectedDate } }],
        },
        orderBy: { effectiveFrom: "desc" },
      }),
    ]);

    return (
      <div className="space-y-6">
        <PageHeader />
        <DateNavigator currentDate={selectedDateISO} isToday={isToday} deptId={dept.id} />
        {isDayClosed && <DayClosedBanner closedAt={dayClose.closedAt} />}
        <HourlyCountForm
          key={`${selectedDateISO}-${dept.id}`}
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
          date={selectedDate.toISOString()}
          supervisorId={session.user.id}
          isReadOnly={isDayClosed}
        />
      </div>
    );
  }

  // ─── Manager: department selector with date persistence ─────────────────────
  const allDepts = await db.department.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, nameAm: true },
  });

  const selectedDeptId = params.dept ?? allDepts[0]?.id ?? "";

  // Load only the selected department's data for the selected date
  const [employees, card] = selectedDeptId
    ? await Promise.all([
        db.employee.findMany({
          where: { departmentId: selectedDeptId, isActive: true },
          include: {
            hourlyCounts: {
              where: { sheet: { date: selectedDate }, departmentId: selectedDeptId },
              orderBy: { updatedAt: "desc" },
              take: 1,
            },
          },
          orderBy: { serialNumber: "asc" },
        }),
        db.incentiveCard.findFirst({
          where: {
            departmentId: selectedDeptId,
            effectiveFrom: { lte: selectedDate },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: selectedDate } }],
          },
          orderBy: { effectiveFrom: "desc" },
        }),
      ])
    : [[], null];

  const selectedDept = allDepts.find((d) => d.id === selectedDeptId);

  return (
    <div className="space-y-6">
      <PageHeader />
      <DateNavigator currentDate={selectedDateISO} isToday={isToday} deptId={selectedDeptId} />
      {isDayClosed && <DayClosedBanner closedAt={dayClose.closedAt} />}

      {/* Department selector - preserve date when changing */}
      <div className="erp-card p-4">
        <form method="GET" className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="date" value={selectedDateISO} />
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
        key={`${selectedDateISO}-${selectedDeptId}`}
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
        date={selectedDate.toISOString()}
        supervisorId={session.user.id}
        isReadOnly={isDayClosed}
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

// ─── Day Closed Banner ────────────────────────────────────────────────────────

function DayClosedBanner({ closedAt }: { closedAt: Date }) {
  const timeStr = new Date(closedAt).toLocaleTimeString("en-ET", { 
    hour: "2-digit", 
    minute: "2-digit",
    hour12: true 
  });

  return (
    <div className="erp-card p-4 border-purple-200 bg-gradient-to-r from-purple-50/50 to-pink-50/30">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 shadow-sm">
          <Lock size={16} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-purple-900 font-ethiopic text-sm mb-1">
            {am.counts.dayAlreadyClosed}
          </h3>
          <p className="text-purple-700 font-ethiopic text-xs leading-relaxed">
            የዕለቱ ሥራ በ {timeStr} ተዘግቷል። ያስቀመጡትን ቁጥር ማየት ይችላሉ ነገር ግን ማስተካከል አይቻልም።
            ለማስተካከል ሱፐርቫይዘሩ ወይም ዋና ሥራ አስኪያጁ ቀኑን መክፈት አለባቸው።
          </p>
        </div>
      </div>
    </div>
  );
}
