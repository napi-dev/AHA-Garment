import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getPageAccess } from "@/lib/auth/permissions";
import { Factory, Package } from "lucide-react";

export default async function BundleBoardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  
  const access = getPageAccess(session.user.role, "/production/bundles");
  if (access === "none") redirect("/dashboard");

  // Get all active jobs grouped by department
  const jobs = await db.job.findMany({
    where: {
      isActive: true,
    },
    include: {
      department: {
        select: { nameAm: true, flowOrder: true },
      },
      hourlyBoxes: {
        select: {
          date: true,
          totalProduced: true,
        },
      },
    },
    orderBy: [
      { department: { flowOrder: "asc" } },
      { sortOrder: "asc" },
    ],
  });

  // Group jobs by department
  const departmentGroups = new Map<string, Array<{
    jobName: string;
    produced: number;
    flowOrder: number | null;
  }>>();

  for (const job of jobs) {
    const deptName = job.department.nameAm;
    const produced = job.hourlyBoxes.reduce((sum, box) => sum + (box.totalProduced || 0), 0);
    
    if (!departmentGroups.has(deptName)) {
      departmentGroups.set(deptName, []);
    }
    
    departmentGroups.get(deptName)!.push({
      jobName: job.nameAm,
      produced,
      flowOrder: job.department.flowOrder,
    });
  }

  // Sort departments by flow order
  const sortedDepts = Array.from(departmentGroups.entries()).sort((a, b) => {
    const flowA = a[1][0]?.flowOrder ?? 999;
    const flowB = b[1][0]?.flowOrder ?? 999;
    return flowA - flowB;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="erp-card p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
              <Factory size={14} />
              <span>የምርት ሂደት</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
              በክፍል ያሉ ስራዎች
            </h1>
            <p className="text-slate-500 text-sm mt-0.5 font-ethiopic">
              Jobs by Department
            </p>
          </div>
        </div>
      </div>

      {/* Department Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedDepts.map(([deptName, jobs]) => (
          <div key={deptName} className="erp-card overflow-hidden">
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
              <h3 className="font-bold text-slate-900 font-ethiopic text-sm flex items-center gap-2">
                <Package size={16} className="text-blue-600" />
                {deptName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-ethiopic">
                {jobs.length} ስራዎች
              </p>
            </div>
            
            <div className="p-4 space-y-2">
              {jobs.map((job, idx) => (
                <div 
                  key={idx}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-ethiopic text-sm text-slate-700 font-semibold">
                        {job.jobName}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-lg font-bold text-slate-900 tabular-nums">
                        {job.produced}
                      </p>
                      <p className="text-xs text-slate-500 font-ethiopic">ፍሬ</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {jobs.length === 0 && (
                <p className="text-center text-slate-400 text-sm font-ethiopic py-4">
                  ምንም ስራ የለም
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {sortedDepts.length === 0 && (
        <div className="erp-card p-12 text-center">
          <Factory size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-ethiopic text-lg">
            ምንም ንቁ ስራዎች የሉም
          </p>
        </div>
      )}
    </div>
  );
}
