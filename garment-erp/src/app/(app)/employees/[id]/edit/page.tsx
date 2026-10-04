import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { getPageAccess, canEditSalary } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { updateEmployee } from "../../actions";
import Link from "next/link";
import { Edit3, ArrowRight, Save, Banknote, ShieldAlert } from "lucide-react";

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  
  const access = getPageAccess(session.user.role, "/employees");
  if (access !== "full") redirect("/dashboard");

  const { id } = await params;
  const emp = await db.employee.findUnique({
    where: { id },
    include: { 
      department: true,
      job: true,
    },
  });
  if (!emp) notFound();

  // Load all departments with their jobs
  const departments = await db.department.findMany({
    where: { isActive: true },
    include: {
      jobs: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { flowOrder: "asc" },
  });

  const action = updateEmployee.bind(null, id);
  const userCanViewSalary = canEditSalary(session.user.role) || session.user.role === "PRODUCTION_MANAGER";

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Top Navigation Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/employees"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors font-ethiopic"
        >
          <ArrowRight size={14} className="rotate-180" />
          <span>ወደ ሠራተኞች ዝርዝር ተመለስ</span>
        </Link>
        <div className="flex items-center gap-2">
          {userCanViewSalary && (
            <Link
              href={`/employees/${id}/salary`}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl font-ethiopic hover:bg-emerald-100 transition-colors"
            >
              <Banknote size={14} />
              <span>{am.salary.title}</span>
            </Link>
          )}
          <Link
            href={`/employees/${id}/offences`}
            className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-xl font-ethiopic hover:bg-amber-100 transition-colors"
          >
            <ShieldAlert size={14} />
            <span>{am.offences.title}</span>
          </Link>
        </div>
      </div>

      {/* Header Card */}
      <div className="erp-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
          <Edit3 size={14} />
          <span>የሠራተኛ መረጃ ማሻሻያ</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          {emp.nameAm}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5 font-ethiopic flex items-center gap-2 flex-wrap">
          <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
            {emp.employeeCode ?? `#${emp.serialNumber}`}
          </span>
          <span>·</span>
          <span>{emp.department.nameAm}</span>
          {emp.job && (
            <>
              <span>·</span>
              <span className="text-blue-600">{emp.job.nameAm}</span>
            </>
          )}
          {emp.lineNo && (
            <>
              <span>·</span>
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold">
                መስመር {emp.lineNo}
              </span>
            </>
          )}
        </p>
      </div>

      {/* Form Card */}
      <form action={action} className="erp-card p-6 md:p-8 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.employees.name} (በአማርኛ) <span className="text-rose-500">*</span>
          </label>
          <input
            name="nameAm"
            defaultValue={emp.nameAm}
            required
            className="input-field font-ethiopic"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            English Name (ስም በእንግሊዝኛ)
          </label>
          <input
            name="nameEn"
            defaultValue={emp.nameEn ?? ""}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.employees.department} <span className="text-rose-500">*</span>
          </label>
          <select
            name="departmentId"
            defaultValue={emp.departmentId}
            required
            id="dept-select"
            className="input-field font-ethiopic text-slate-800"
          >
            <option value="">የሥራ ክፍል ይምረጡ</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id} data-jobs={JSON.stringify(d.jobs)}>
                {d.nameAm}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            ስራ (Job) <span className="text-rose-500">*</span>
          </label>
          <select
            name="jobId"
            defaultValue={emp.jobId ?? ""}
            required
            id="job-select"
            className="input-field font-ethiopic text-slate-800"
          >
            <option value="">ስራ ይምረጡ</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            የመስመር ቁጥር (Line Number)
          </label>
          <select
            name="lineNo"
            defaultValue={emp.lineNo ?? ""}
            className="input-field font-ethiopic text-slate-800"
          >
            <option value="">መስመር የለም</option>
            <option value="1">መስመር 1</option>
            <option value="2">መስመር 2</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            የቅጥር ቀን (Hire Date)
          </label>
          <input
            name="hiredAt"
            type="date"
            defaultValue={emp.hiredAt ? emp.hiredAt.toISOString().split("T")[0] : ""}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            ማስታወሻ (Notes)
          </label>
          <textarea
            name="notes"
            defaultValue={emp.notes ?? ""}
            rows={3}
            className="input-field font-ethiopic resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.employees.status} <span className="text-rose-500">*</span>
          </label>
          <select
            name="isActive"
            defaultValue={String(emp.isActive)}
            className="input-field font-ethiopic text-slate-800"
          >
            <option value="true">{am.employees.active}</option>
            <option value="false">{am.employees.inactive}</option>
          </select>
        </div>

        <div className="pt-4 flex items-center gap-3">
          <button type="submit" className="btn-primary flex-1 font-ethiopic">
            <Save size={16} />
            <span>{am.save}</span>
          </button>
          <Link
            href="/employees"
            className="btn-secondary px-6 font-ethiopic text-center"
          >
            {am.cancel}
          </Link>
        </div>
      </form>

      {/* Client-side script for job filtering */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', function() {
              const deptSelect = document.getElementById('dept-select');
              const jobSelect = document.getElementById('job-select');
              const currentJobId = '${emp.jobId ?? ''}';
              
              function updateJobs() {
                const selected = deptSelect.options[deptSelect.selectedIndex];
                const jobs = selected.dataset.jobs ? JSON.parse(selected.dataset.jobs) : [];
                
                jobSelect.innerHTML = '<option value="">ስራ ይምረጡ</option>';
                
                jobs.forEach(job => {
                  const option = document.createElement('option');
                  option.value = job.id;
                  option.textContent = job.nameAm;
                  if (job.id === currentJobId) option.selected = true;
                  jobSelect.appendChild(option);
                });
                
                jobSelect.disabled = jobs.length === 0;
              }
              
              deptSelect.addEventListener('change', updateJobs);
              updateJobs(); // Initial load
            });
          `,
        }}
      />
    </div>
  );
}
