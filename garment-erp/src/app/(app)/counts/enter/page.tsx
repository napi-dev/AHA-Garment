import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getPageAccess } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { HourlyCountForm } from "./hourly-count-form";
import { DateNavigator } from "./date-navigator";
import { Clock, Lock, Briefcase } from "lucide-react";
import { getEffectiveDate } from "@/lib/date-override/effective-date";

// Type for existing hourly box
type ExistingBox = {
  id: string;
  h1: number | null; h2: number | null; h3: number | null; h4: number | null;
  h5: number | null; h6: number | null; h7: number | null; h8: number | null;
  totalProduced: number;
  targetForDay: number;
  plusPieces: number;
  minusPieces: number;
  mistakes: number;
  mistakeReason: string | null;
  isLocked: boolean;
};

export default async function CountEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; date?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Check page access
  const access = getPageAccess(session.user.role, "/counts/enter");
  if (access === "none") {
    redirect("/dashboard");
  }

  const params = await searchParams;

  // ─── Determine selected date ───────────────────────────────────────────────
  let selectedDate: Date;
  if (params.date) {
    selectedDate = new Date(params.date + "T00:00:00Z");
  } else {
    selectedDate = await getEffectiveDate();
  }
  selectedDate.setUTCHours(0, 0, 0, 0);

  const selectedDateISO = selectedDate.toISOString().split("T")[0];
  const today = await getEffectiveDate();
  const todayISO = today.toISOString().split("T")[0];
  const isToday = selectedDateISO === todayISO;

  // ─── Check if selected day is closed ────────────────────────────────────────
  const dayClose = await db.dayClose.findUnique({ where: { date: selectedDate } });
  const isDayClosed = !!dayClose;

  // ─── Load all jobs (grouped by department) ──────────────────────────────────
  const allJobs = await db.job.findMany({
    where: { isActive: true },
    include: { 
      department: { select: { id: true, nameAm: true, flowOrder: true } },
      incentiveCards: {
        where: {
          effectiveFrom: { lte: selectedDate },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: selectedDate } }],
        },
        orderBy: { effectiveFrom: "desc" },
        take: 1,
      },
    },
    orderBy: [
      { department: { flowOrder: "asc" } },
      { sortOrder: "asc" },
    ],
  });

  // Group jobs by department for display
  const jobsByDept = allJobs.reduce((acc, job) => {
    const deptName = job.department.nameAm;
    if (!acc[deptName]) acc[deptName] = [];
    acc[deptName].push(job);
    return acc;
  }, {} as Record<string, typeof allJobs>);

  const selectedJobId = params.job ?? allJobs[0]?.id ?? "";
  const selectedJob = allJobs.find((j) => j.id === selectedJobId);

  // ─── Pagination setup ───────────────────────────────────────────────────────
  const page = parseInt(params.page ?? "1", 10);
  const PAGE_SIZE = 50;

  // Count total employees for selected job
  const totalEmployees = selectedJobId
    ? await db.employee.count({
        where: { jobId: selectedJobId, isActive: true },
      })
    : 0;

  const totalPages = Math.ceil(totalEmployees / PAGE_SIZE);
  const needsPagination = totalEmployees > PAGE_SIZE;

  // ─── Load employees for selected job ────────────────────────────────────────
  const employees = selectedJobId
    ? await db.employee.findMany({
        where: { jobId: selectedJobId, isActive: true },
        include: {
          hourlyBoxes: {
            where: { date: selectedDate },
            take: 1,
          },
        },
        orderBy: { serialNumber: "asc" },
        ...(needsPagination && {
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
      })
    : [];

  const targetPerHour = selectedJob?.incentiveCards[0]?.targetPerHour ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader />
      <DateNavigator currentDate={selectedDateISO} isToday={isToday} jobId={selectedJobId} />
      {isDayClosed && <DayClosedBanner closedAt={dayClose.closedAt} />}

      {/* Job selector - two dropdowns: department then job */}
      <div className="erp-card p-5">
        <form method="GET" className="space-y-4">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="date" value={selectedDateISO} />
          
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 font-ethiopic mb-3">
            <Briefcase size={14} className="text-blue-500" />
            <span>ስራ ምረጥ (በክፍል የተደራጀ)፦</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Department Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-ethiopic">
                ክፍል ይምረጡ
              </label>
              <select
                name="department"
                id="department-select"
                className="input-field font-ethiopic text-slate-800"
              >
                <option value="">ሁሉም ክፍሎች</option>
                {Object.keys(jobsByDept).map((deptName) => (
                  <option 
                    key={deptName} 
                    value={deptName}
                    selected={selectedJob && jobsByDept[deptName].some(j => j.id === selectedJobId)}
                  >
                    {deptName}
                  </option>
                ))}
              </select>
            </div>

            {/* Job Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-ethiopic">
                ስራ ይምረጡ
              </label>
              <select
                name="job"
                id="job-select"
                className="input-field font-ethiopic text-slate-800"
              >
                <option value="">ስራ ይምረጡ...</option>
                {Object.entries(jobsByDept).map(([deptName, jobs]) =>
                  jobs.map((job) => {
                    const rate = job.incentiveCards[0];
                    return (
                      <option
                        key={job.id}
                        value={job.id}
                        data-department={deptName}
                        selected={job.id === selectedJobId}
                      >
                        {job.nameAm} — {deptName}
                        {rate ? ` (${rate.targetPerHour} ፍሬ/ሰዓት)` : ""}
                      </option>
                    );
                  })
                )}
              </select>
            </div>
          </div>

          <div className="mt-3">
            <button
              type="submit"
              className="btn-primary py-2 px-4 text-xs"
            >
              ስራ ተግብር
            </button>
          </div>
        </form>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('DOMContentLoaded', function() {
                const deptSelect = document.getElementById('department-select');
                const jobSelect = document.getElementById('job-select');
                const form = jobSelect?.form;
                
                if (deptSelect && jobSelect) {
                  // Filter jobs based on department selection
                  function filterJobs() {
                    const selectedDept = deptSelect.value;
                    const allOptions = Array.from(jobSelect.options);
                    
                    allOptions.forEach((option) => {
                      if (option.value === '') {
                        option.style.display = 'block';
                        return;
                      }
                      
                      const optDept = option.getAttribute('data-department');
                      if (!selectedDept || optDept === selectedDept) {
                        option.style.display = 'block';
                      } else {
                        option.style.display = 'none';
                      }
                    });
                    
                    // Reset job selection if current job is not in filtered list
                    const currentJob = jobSelect.value;
                    if (currentJob) {
                      const currentOption = jobSelect.querySelector('option[value="' + currentJob + '"]');
                      if (currentOption && currentOption.style.display === 'none') {
                        jobSelect.value = '';
                      }
                    }
                  }
                  
                  // Auto-submit when job is selected
                  jobSelect.addEventListener('change', function() {
                    if (jobSelect.value && form) {
                      form.submit();
                    }
                  });
                  
                  deptSelect.addEventListener('change', filterJobs);
                  filterJobs(); // Initial filter
                }
              });
            `,
          }}
        />
      </div>

      {selectedJob && (
        <HourlyCountForm
          key={`${selectedDateISO}-${selectedJobId}-${page}`}
          jobId={selectedJob.id}
          jobNameAm={selectedJob.nameAm}
          departmentId={selectedJob.department.id}
          departmentNameAm={selectedJob.department.nameAm}
          targetPerHour={targetPerHour}
          employees={employees.map((e) => ({
            id: e.id,
            serialNumber: e.serialNumber,
            nameAm: e.nameAm,
            existingBox: (e.hourlyBoxes[0] ?? null) as ExistingBox | null,
          }))}
          date={selectedDate.toISOString()}
          supervisorId={session.user.id}
          isReadOnly={isDayClosed}
          currentPage={page}
          totalPages={totalPages}
          totalEmployees={totalEmployees}
          needsPagination={needsPagination}
        />
      )}
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
