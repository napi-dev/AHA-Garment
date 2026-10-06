import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { createJob, deleteJob, toggleJobStatus } from "../actions";
import { JobDeleteButton } from "./job-delete-button";
import Link from "next/link";
import { 
  Briefcase, ArrowLeft, Plus, Trash2, ToggleLeft, ToggleRight, 
  Users, Award, AlertCircle, CheckCircle2, Layers 
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "settings:manage");

  const params = await searchParams;

  // Load departments with their jobs and counts
  const departments = await db.department.findMany({
    where: { isActive: true },
    include: {
      jobs: {
        include: {
          _count: {
            select: {
              employees: true,
              hourlyBoxes: true,
              incentiveLines: true,
            },
          },
          incentiveCards: {
            where: { effectiveTo: null },
            orderBy: { effectiveFrom: "desc" },
            take: 1,
          },
        },
        orderBy: [{ sortOrder: "asc" }, { nameAm: "asc" }],
      },
    },
    orderBy: [{ flowOrder: "asc" }, { nameAm: "asc" }],
  });

  const totalJobs = departments.reduce((acc, d) => acc + d.jobs.length, 0);
  const activeJobs = departments.reduce(
    (acc, d) => acc + d.jobs.filter((j) => j.isActive).length,
    0
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-ethiopic">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={14} />
          <span>ወደ ቅንብሮች ማጠቃለያ ተመለስ</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="erp-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
            <Briefcase size={16} />
            <span>የፋብሪካው የስራ ዓይነቶች ማዋቀሪያ</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            የስራ ዓይነቶች አስተዳደር (Jobs Management)
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            በእያንዳንዱ የስራ ክፍል ውስጥ አዳዲስ ስራዎችን ይጨምሩ፣ አላስፈላጊ ስራዎችን ይሰርዙ ወይም ያቦዝኑ
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-center">
            <p className="text-xs text-blue-700 font-medium">ጠቅላላ ስራዎች</p>
            <p className="text-xl font-bold font-mono text-blue-900 mt-0.5">{totalJobs}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-center">
            <p className="text-xs text-emerald-700 font-medium">ንቁ ስራዎች</p>
            <p className="text-xl font-bold font-mono text-emerald-900 mt-0.5">{activeJobs}</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {params.saved === "1" && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          <span>የስራው መረጃ በተሳካ ሁኔታ ተስተካክሏል!</span>
        </div>
      )}

      {/* Add New Job Form Card */}
      <div className="erp-card p-6 border-2 border-blue-100">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={18} className="text-blue-600" />
          <h2 className="font-bold text-slate-900 text-base">
            አዲስ የስራ ዓይነት መዝግብ (Add New Job)
          </h2>
        </div>

        <form action={createJob} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              የሥራ ክፍል (Department) <span className="text-rose-500">*</span>
            </label>
            <select name="departmentId" required className="input-field text-slate-800 text-sm">
              <option value="">ክፍል ይምረጡ...</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nameAm} {d.nameEn ? `(${d.nameEn})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              የስራ ስም በአማርኛ <span className="text-rose-500">*</span>
            </label>
            <input
              name="nameAm"
              required
              placeholder="ምሳሌ፦ ኮላ መስፋት፣ ኪስ መለጠፍ..."
              className="input-field text-sm text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              ስም በእንግሊዝኛ (English Name)
            </label>
            <input
              name="nameEn"
              placeholder="e.g. Collar Stitching"
              className="input-field text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              የሰዓት ዒላማ (Target / Hour)
            </label>
            <input
              name="targetPerHour"
              type="number"
              defaultValue={50}
              min={1}
              className="input-field text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              የፍሬ ተመን በብር (Rate / Piece)
            </label>
            <input
              name="ratePerPiece"
              type="number"
              step="0.01"
              defaultValue="0.50"
              min={0}
              className="input-field text-sm font-mono"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm shadow-sm"
            >
              <Plus size={16} />
              <span>ስራውን መዝግብ</span>
            </button>
          </div>
        </form>
      </div>

      {/* Departments & Jobs List */}
      <div className="space-y-6">
        {departments.map((dept) => (
          <div key={dept.id} className="erp-card overflow-hidden">
            <div className="bg-slate-50/80 px-6 py-3.5 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Layers size={16} className="text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {dept.nameAm}
                </h3>
                {dept.nameEn && (
                  <span className="text-xs text-slate-400 font-normal">
                    ({dept.nameEn})
                  </span>
                )}
                <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                  {dept.jobs.length} ስራዎች
                </span>
              </div>
            </div>

            {dept.jobs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                በዚህ ክፍል ውስጥ የተመዘገበ የስራ ዓይነት የለም።
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {dept.jobs.map((job) => {
                  const card = job.incentiveCards[0];
                  const hasHistory =
                    job._count.employees > 0 ||
                    job._count.hourlyBoxes > 0 ||
                    job._count.incentiveLines > 0;

                  return (
                    <div
                      key={job.id}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors ${
                        !job.isActive ? "opacity-60 bg-slate-50/30" : ""
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 text-sm">
                            {job.nameAm}
                          </span>
                          {job.nameEn && (
                            <span className="text-xs text-slate-500 font-mono">
                              ({job.nameEn})
                            </span>
                          )}
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                              job.isActive
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {job.isActive ? "ንቁ (Active)" : "የቦዘነ (Inactive)"}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1 font-mono">
                            <Users size={13} className="text-slate-400" />
                            <span>{job._count.employees} ሠራተኞች</span>
                          </span>

                          {card && (
                            <span className="flex items-center gap-1 font-mono text-blue-700">
                              <Award size={13} className="text-blue-500" />
                              <span>
                                ዒላማ: {card.targetPerHour}/ሰዓት · ተመን:{" "}
                                {parseFloat(card.ratePerPiece.toString()).toFixed(2)} ብር
                              </span>
                            </span>
                          )}

                          {hasHistory && (
                            <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded">
                              የታሪክ ምዝገባ አለው
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {/* Toggle Active Button */}
                        <form action={toggleJobStatus.bind(null, job.id)}>
                          <button
                            type="submit"
                            title={job.isActive ? "ስራውን አቦዝን" : "ስራውን አንቃ"}
                            className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-colors ${
                              job.isActive
                                ? "text-amber-700 border-amber-200 hover:bg-amber-50"
                                : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            }`}
                          >
                            {job.isActive ? (
                              <>
                                <ToggleRight size={14} />
                                <span>አቦዝን</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft size={14} />
                                <span>አንቃ</span>
                              </>
                            )}
                          </button>
                        </form>

                        {/* Delete or Deactivate Button */}
                        <JobDeleteButton
                          jobId={job.id}
                          jobName={job.nameAm}
                          hasHistory={hasHistory}
                          action={deleteJob.bind(null, job.id)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
