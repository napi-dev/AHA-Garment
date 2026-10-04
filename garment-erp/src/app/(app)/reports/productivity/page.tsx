import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate, todayISOStringEAT } from "@/lib/ethiopian-calendar";
import Link from "next/link";
import { Users, ArrowLeft, Filter, TrendingUp, CheckCircle2, Award, Calendar } from "lucide-react";

export default async function ProductivityReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "/reports");

  const params  = await searchParams;
  const dateStr = params.date ?? todayISOStringEAT();
  const date    = new Date(dateStr + "T00:00:00Z");

  const boxes = await db.hourlyBox.findMany({
    where: { date },
    include: {
      employee: true,
      job: {
        include: { department: true },
      },
    },
    orderBy: [
      { job: { department: { flowOrder: "asc" } } },
      { employee: { serialNumber: "asc" } },
    ],
  });

  // Compute stats per row
  const rows = boxes.map((b) => {
    const target  = b.targetForDay;
    const produced = b.totalProduced;
    const pct     = target > 0 ? Math.round((produced / target) * 100 * 10) / 10 : null;
    return { ...b, department: b.job.department, target, produced, pct, isAbove: produced >= target };
  });

  const aboveTarget  = rows.filter((r) => r.isAbove).length;
  const totalProd    = rows.reduce((s, r) => s + r.produced, 0);
  const avgPct       = rows.filter((r) => r.pct !== null).length > 0
    ? rows.filter((r) => r.pct !== null).reduce((s, r) => s + (r.pct ?? 0), 0) /
      rows.filter((r) => r.pct !== null).length
    : null;

  // Group by department
  const deptMap = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.department.id;
    if (!deptMap.has(key)) deptMap.set(key, []);
    deptMap.get(key)!.push(row);
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 font-ethiopic"
        >
          <ArrowLeft size={14} />
          <span>ወደ ሪፖርቶች ማጠቃለያ ተመለስ</span>
        </Link>
      </div>

      {/* Header & Date Filter Card */}
      <div className="erp-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
              <TrendingUp size={14} />
              <span>የምርታማነት ትንተና</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
              {am.reports.EMPLOYEE_PRODUCTIVITY}
            </h1>
            <p className="text-slate-500 font-ethiopic text-sm mt-0.5">
              የሠራተኞች የዕለት የምርት አፈጻጸም፣ የዒላማ ስኬት እና የትርፍ/ጉድለት ንጽጽር — <span className="font-semibold text-slate-700">{formatAsEthDate(date)}</span>
            </p>
          </div>

          <form method="GET" className="flex items-center gap-2">
            <input
              type="date"
              name="date"
              defaultValue={dateStr}
              className="input-field text-xs py-2 px-3"
            />
            <button
              type="submit"
              className="btn-primary text-xs py-2.5 px-4 flex items-center gap-1.5"
            >
              <Filter size={14} />
              <span>{am.filter}</span>
            </button>
          </form>
        </div>
      </div>

      {boxes.length === 0 ? (
        <div className="erp-card p-12 text-center space-y-2">
          <Calendar size={32} className="mx-auto text-slate-300" />
          <h3 className="font-bold text-slate-800 font-ethiopic">ምንም የተረጋገጠ ቁጥር አልተገኘም</h3>
          <p className="text-xs text-slate-400 font-ethiopic max-w-sm mx-auto">
            በተመረጠው ቀን ({formatAsEthDate(date)}) የተዘጋ ወይም የተረጋገጠ የሰዓት ቆጠራ ሰሌዳ አልተገኘም።
          </p>
        </div>
      ) : (
        <>
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="erp-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 font-ethiopic">ተሳታፊ ሠራተኞች</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums mt-2">
                {rows.length} <span className="text-xs font-normal text-slate-500">ሰው</span>
              </p>
            </div>

            <div className="erp-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 font-ethiopic">ጠቅላላ የተመረተ</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Award size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-indigo-700 tabular-nums mt-2">
                {totalProd.toLocaleString()} <span className="text-xs font-normal text-slate-500">ፍሬ</span>
              </p>
            </div>

            <div className="erp-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 font-ethiopic">ዒላማ ያሳኩ</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-2">
                {aboveTarget} <span className="text-xs font-normal text-slate-400">/ {rows.length}</span>
              </p>
            </div>

            <div className="erp-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 font-ethiopic">አማካይ የስኬት ምጣኔ</span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                  <TrendingUp size={16} />
                </div>
              </div>
              <p className={`text-2xl font-bold tabular-nums mt-2 ${avgPct !== null && avgPct >= 100 ? "text-emerald-700" : "text-amber-600"}`}>
                {avgPct !== null ? `${avgPct.toFixed(1)}%` : "—"}
              </p>
            </div>
          </div>

          {/* Department Group Sections */}
          <div className="space-y-6">
            {[...deptMap.entries()].map(([deptId, deptRows]) => {
              const deptName  = deptRows[0].department.nameAm;
              const deptTotal = deptRows.reduce((s, r) => s + r.produced, 0);
              const deptAbove = deptRows.filter((r) => r.isAbove).length;

              return (
                <div key={deptId} className="erp-card overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-slate-900 font-ethiopic text-sm">
                      {deptName}
                    </span>
                    <span className="text-xs text-slate-600 font-ethiopic tabular-nums">
                      <strong>{deptAbove}/{deptRows.length}</strong> ዒላማ ያሳኩ &nbsp;·&nbsp; ጠቅላላ <strong>{deptTotal.toLocaleString()}</strong> ፍሬ
                    </span>
                  </div>

                  <table className="w-full text-left data-table">
                    <thead>
                      <tr>
                        <th className="w-12 text-center">{am.serialNumber}</th>
                        <th>{am.employees.name}</th>
                        <th className="text-center">የዕለት ዒላማ</th>
                        <th className="text-center">ያመረቱት</th>
                        <th className="text-center">+ትርፍ</th>
                        <th className="text-center">−ጉድለት</th>
                        <th className="text-center">የስኬት %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deptRows.map((r) => (
                        <tr key={r.id} className={r.isAbove ? "bg-emerald-50/20" : ""}>
                          <td className="text-center tabular-nums text-slate-400 font-mono text-xs">
                            {r.employee.serialNumber}
                          </td>
                          <td className="font-semibold text-slate-800 font-ethiopic">
                            {r.employee.nameAm}
                          </td>
                          <td className="tabular-nums text-center text-slate-500 font-medium">
                            {r.target > 0 ? r.target.toLocaleString() : "—"}
                          </td>
                          <td className="tabular-nums font-bold text-center text-slate-900">
                            {r.produced.toLocaleString()}
                          </td>
                          <td className={`tabular-nums text-center font-semibold ${r.plusPieces > 0 ? "text-emerald-700" : "text-slate-300"}`}>
                            {r.plusPieces > 0 ? `+${r.plusPieces}` : "—"}
                          </td>
                          <td className={`tabular-nums text-center font-semibold ${r.minusPieces > 0 ? "text-rose-600" : "text-slate-300"}`}>
                            {r.minusPieces > 0 ? `−${r.minusPieces}` : "—"}
                          </td>
                          <td className="text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                              r.pct !== null && r.pct >= 100
                                ? "bg-emerald-100 text-emerald-800"
                                : r.pct !== null && r.pct < 80
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}>
                              {r.pct !== null ? `${r.pct}%` : "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
