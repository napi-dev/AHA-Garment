import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import Link from "next/link";

export default async function ProductivityReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "reports:view");

  const params  = await searchParams;
  const dateStr = params.date ?? new Date().toISOString().split("T")[0];
  const date    = new Date(dateStr + "T00:00:00Z");

  const lines = await db.hourlyCountLine.findMany({
    where: { sheet: { date }, status: { not: "DRAFT" } },
    include: {
      employee: true,
      department: true,
    },
    orderBy: [
      { department: { sortOrder: "asc" } },
      { employee: { serialNumber: "asc" } },
    ],
  });

  if (lines.length === 0) {
    return (
      <div className="space-y-4">
        <Header dateStr={dateStr} date={date} />
        <p className="bg-gray-50 rounded-2xl p-10 text-center text-gray-400 font-ethiopic">
          ዛሬ ምንም ቁጥር አልተቀመጠም
        </p>
      </div>
    );
  }

  // Compute stats per row
  const rows = lines.map((l) => {
    const target  = l.targetForDay;
    const produced = l.totalProduced;
    const pct     = target > 0 ? Math.round((produced / target) * 100 * 10) / 10 : null;
    return { ...l, target, produced, pct, isAbove: produced >= target };
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
    <div className="space-y-5">
      <Header dateStr={dateStr} date={date} />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SC label="ሠራተኞች"       value={String(rows.length)} />
        <SC label="ጠቅ. ያደረሱ"    value={totalProd.toLocaleString()} color="text-blue-700" />
        <SC label="ከዒላማ በላይ"     value={`${aboveTarget} / ${rows.length}`} color="text-green-700" />
        <SC label="አማካይ %"        value={avgPct !== null ? `${avgPct.toFixed(1)}%` : "—"}
          color={avgPct !== null && avgPct >= 100 ? "text-green-700" : "text-amber-600"} />
      </div>

      {/* Per-department sections */}
      {[...deptMap.entries()].map(([deptId, deptRows]) => {
        const deptName  = deptRows[0].department.nameAm;
        const deptTotal = deptRows.reduce((s, r) => s + r.produced, 0);
        const deptAbove = deptRows.filter((r) => r.isAbove).length;

        return (
          <div key={deptId} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="font-semibold text-gray-700 font-ethiopic">{deptName}</span>
              <span className="text-xs text-gray-500 font-ethiopic tabular-nums">
                {deptAbove}/{deptRows.length} ከዒላማ ↑ · {deptTotal.toLocaleString()} ፍሬ
              </span>
            </div>
            <table className="w-full text-sm data-table">
              <thead>
                <tr>
                  <th className="w-10">{am.serialNumber}</th>
                  <th>{am.employees.name}</th>
                  <th>ዒላማ</th>
                  <th>ያደረሱ</th>
                  <th>+ፍሬ</th>
                  <th>−ፍሬ</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {deptRows.map((r) => (
                  <tr key={r.id} className={r.isAbove ? "bg-green-50/30" : ""}>
                    <td className="text-center tabular-nums text-gray-400">{r.employee.serialNumber}</td>
                    <td className="font-ethiopic text-gray-800">{r.employee.nameAm}</td>
                    <td className="tabular-nums text-center text-gray-500">
                      {r.target > 0 ? r.target.toLocaleString() : "—"}
                    </td>
                    <td className="tabular-nums font-semibold text-center">{r.produced.toLocaleString()}</td>
                    <td className={`tabular-nums text-center font-medium ${r.plusPieces > 0 ? "text-green-700" : "text-gray-300"}`}>
                      {r.plusPieces > 0 ? `+${r.plusPieces}` : "—"}
                    </td>
                    <td className={`tabular-nums text-center font-medium ${r.minusPieces > 0 ? "text-red-600" : "text-gray-300"}`}>
                      {r.minusPieces > 0 ? `−${r.minusPieces}` : "—"}
                    </td>
                    <td className={`tabular-nums text-center font-semibold ${r.pct !== null && r.pct >= 100 ? "text-green-700" : r.pct !== null && r.pct < 80 ? "text-red-600" : "text-amber-600"}`}>
                      {r.pct !== null ? `${r.pct}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function Header({ dateStr, date }: { dateStr: string; date: Date }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <p className="text-sm text-gray-500 mb-1">
          <Link href="/reports" className="hover:underline font-ethiopic">ሪፖርቶች</Link> /
        </p>
        <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{am.reports.EMPLOYEE_PRODUCTIVITY}</h1>
        <p className="text-gray-500 text-sm mt-0.5 font-ethiopic">{formatAsEthDate(date)}</p>
      </div>
      <form method="GET" className="flex gap-2">
        <input type="date" name="date" defaultValue={dateStr}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-ethiopic hover:bg-blue-700">{am.filter}</button>
      </form>
    </div>
  );
}

function SC({ label, value, color = "text-gray-800" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-500 font-ethiopic mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
