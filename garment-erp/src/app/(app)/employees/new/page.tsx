import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getPageAccess } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { createEmployee } from "../actions";
import Link from "next/link";
import { UserPlus, ArrowRight, UserCheck } from "lucide-react";

export default async function NewEmployeePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  
  const access = getPageAccess(session.user.role, "/employees");
  if (access !== "full") {
    redirect("/dashboard");
  }

  // Load departments with their jobs
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

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Top Navigation Link */}
      <div>
        <Link
          href="/employees"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors font-ethiopic"
        >
          <ArrowRight size={14} className="rotate-180" />
          <span>ወደ ሠራተኞች ዝርዝር ተመለስ</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="erp-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
          <UserPlus size={14} />
          <span>የሰው ኃይል ምዝገባ</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          {am.employees.addEmployee}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5 font-ethiopic">
          አዲስ ሠራተኛ ወደ ፋብሪካው የመረጃ ቋት ለማስገባት ቅጹን በጥንቃቄ ይሙሉ
        </p>
      </div>

      {/* Form Card */}
      <form action={createEmployee} className="erp-card p-6 md:p-8 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.employees.name} (በአማርኛ) <span className="text-rose-500">*</span>
          </label>
          <input
            name="nameAm"
            required
            className="input-field font-ethiopic"
            placeholder="ምሳሌ፦ አበባየሁ በቀለ"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            English Name (ስም በእንግሊዝኛ - አማራጭ)
          </label>
          <input
            name="nameEn"
            className="input-field"
            placeholder="e.g. Abebayehu Bekele"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.employees.department} <span className="text-rose-500">*</span>
          </label>
          <select
            name="departmentId"
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
            required
            id="job-select"
            className="input-field font-ethiopic text-slate-800"
          >
            <option value="">መጀመሪያ ክፍል ይምረጡ</option>
          </select>
          <p className="text-xs text-slate-500 mt-1 font-ethiopic">
            የስራው ዓይነት የማበረታቻ ተመን ይወስናል
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            የመስመር ቁጥር (Line Number - አማራጭ)
          </label>
          <select
            name="lineNo"
            className="input-field font-ethiopic text-slate-800"
          >
            <option value="">መስመር የለም</option>
            <option value="1">መስመር 1</option>
            <option value="2">መስመር 2</option>
          </select>
          <p className="text-xs text-slate-500 mt-1 font-ethiopic">
            ለስፌትና ቅንጨባ ሠራተኞች ብቻ
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            የቅጥር ቀን (Hire Date - አማራጭ)
          </label>
          <input
            name="hiredAt"
            type="date"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            ማስታወሻ (Notes - አማራጭ)
          </label>
          <textarea
            name="notes"
            rows={3}
            className="input-field font-ethiopic resize-none"
            placeholder="ተጨማሪ መረጃ..."
          />
        </div>

        <div className="pt-4 flex items-center gap-3">
          <button type="submit" className="btn-primary flex-1 font-ethiopic">
            <UserCheck size={16} />
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
              
              deptSelect.addEventListener('change', function() {
                const selected = this.options[this.selectedIndex];
                const jobs = selected.dataset.jobs ? JSON.parse(selected.dataset.jobs) : [];
                
                jobSelect.innerHTML = '<option value="">ስራ ይምረጡ</option>';
                
                jobs.forEach(job => {
                  const option = document.createElement('option');
                  option.value = job.id;
                  option.textContent = job.nameAm;
                  jobSelect.appendChild(option);
                });
                
                jobSelect.disabled = jobs.length === 0;
              });
            });
          `,
        }}
      />
    </div>
  );
}
