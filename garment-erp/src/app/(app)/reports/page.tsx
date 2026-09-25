import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import Link from "next/link";
import { FileText, Package, Scissors, Users, ClipboardList } from "lucide-react";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "reports:view");

  // Summary stats for the report cards
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalMaterials,
    lowStockCount,
    cutJobsToday,
    openOrders,
    pendingReportJobs,
  ] = await Promise.all([
    db.material.count({ where: { isActive: true } }),
    // low-stock computed inline — just count existing alerts
    db.alert.count({ where: { type: "LOW_STOCK", resolvedAt: null } }),
    db.cutJob.count({ where: { date: today } }),
    db.prodOrder.count({ where: { isActive: true } }),
    db.reportJob.count({ where: { status: "pending" } }),
  ]);

  const REPORT_CARDS = [
    {
      title: am.reports.DAILY_INVENTORY,
      description: "SKU ዝርዝር፣ ዛሬ ሂደቶች፣ ዝቅተኛ ወሰን ላይ ያሉ",
      href: "/reports/inventory",
      icon: <Package size={24} />,
      color: "bg-blue-50 text-blue-700",
      stat: `${lowStockCount} ዝቅተኛ`,
      statColor: lowStockCount > 0 ? "text-orange-600" : "text-green-600",
    },
    {
      title: am.reports.CUTTING_WASTAGE,
      description: "ዛሬ ቆርጦዎች፣ ብክነት %፣ ከወሰን በላይ ያሉ",
      href: "/reports/cutting-wastage",
      icon: <Scissors size={24} />,
      color: "bg-orange-50 text-orange-700",
      stat: `${cutJobsToday} ዛሬ`,
      statColor: "text-gray-600",
    },
    {
      title: am.reports.EMPLOYEE_PRODUCTIVITY,
      description: "ዛሬ የሠራተኞች ቁጥር፣ ከዒላማ % ፣ ክፍል ማጠቃለያ",
      href: "/reports/productivity",
      icon: <Users size={24} />,
      color: "bg-green-50 text-green-700",
      stat: "ዛሬ",
      statColor: "text-gray-600",
    },
    {
      title: am.reports.ORDER_STATUS,
      description: "ሁሉም ንቁ ትዕዛዞች፣ ደረጃ፣ ዘግይቶ ያሉ",
      href: "/reports/orders",
      icon: <ClipboardList size={24} />,
      color: "bg-purple-50 text-purple-700",
      stat: `${openOrders} ንቁ`,
      statColor: openOrders > 0 ? "text-blue-600" : "text-gray-400",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{am.reports.title}</h1>
        {pendingReportJobs > 0 && (
          <span className="text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full font-ethiopic">
            {pendingReportJobs} ሪፖርቶች በጥበቃ ላይ
          </span>
        )}
      </div>

      {/* Report cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {REPORT_CARDS.map((card) => (
          <Link key={card.href} href={card.href}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow flex items-start gap-4">
            <div className={`p-3 rounded-xl ${card.color}`}>{card.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 font-ethiopic">{card.title}</p>
              <p className="text-sm text-gray-500 font-ethiopic mt-0.5">{card.description}</p>
              <p className={`text-sm font-semibold mt-2 tabular-nums ${card.statColor}`}>{card.stat}</p>
            </div>
            <span className="text-gray-300 text-lg">›</span>
          </Link>
        ))}
      </div>

      {/* Report delivery status */}
      <RecentJobsTable />
    </div>
  );
}

async function RecentJobsTable() {
  const jobs = await db.reportJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 15,
  });
  if (jobs.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-700 font-ethiopic">{am.reports.deliveryStatus}</h2>
      </div>
      <table className="w-full text-sm data-table">
        <thead>
          <tr>
            <th>ሪፖርት</th>
            <th>ቀን</th>
            <th>{am.status}</th>
            <th>ሙከራ</th>
            <th>ስህተት</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td className="text-xs font-ethiopic">
                {am.reports[job.type as keyof typeof am.reports] ?? job.type}
              </td>
              <td className="tabular-nums text-xs text-gray-500">
                {job.periodDate.toISOString().split("T")[0]}
              </td>
              <td>
                <span className={`text-xs px-2 py-0.5 rounded-full font-ethiopic ${
                  job.status === "sent"   ? "bg-green-100 text-green-700"  :
                  job.status === "failed" ? "bg-red-100 text-red-700"      :
                  "bg-yellow-100 text-yellow-700"
                }`}>
                  {job.status === "sent"   ? am.reports.sent   :
                   job.status === "failed" ? am.reports.failed : am.reports.pending}
                </span>
              </td>
              <td className="text-center tabular-nums text-gray-400">{job.retryCount}</td>
              <td className="text-xs text-red-500 max-w-[160px] truncate" title={job.errorMessage ?? ""}>
                {job.errorMessage ? job.errorMessage.slice(0, 40) + "…" : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
