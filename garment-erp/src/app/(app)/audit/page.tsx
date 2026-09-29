import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import { ScrollText, Filter, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  // Count operations
  SAVE_HOURLY_COUNT:        "📝 የሰዓት ቁጥር ገባ",
  VERIFY_COUNT:             "✅ ቁጥር ተረጋገጠ",
  CLOSE_DAY:                "🔒 ቀን ተዘጋ",
  // Incentive
  CLOSE_INCENTIVE_PERIOD:   "📊 ወቅት ተጠናቀቀ",
  APPROVE_INCENTIVE_PERIOD: "✅ ወቅት ፀደቀ",
  // Salary
  SET_SALARY:               "💰 ደሞዝ ተቀየረ",
  APPROVE_SALARY_SCHEDULE:  "✅ ደሞዝ ሰሌዳ ፀደቀ",
  // Employees
  CREATE_EMPLOYEE:          "👤 ሠራተኛ ተጨመረ",
  UPDATE_EMPLOYEE:          "✏️ ሠራተኛ ተስተካከለ",
  DELETE_EMPLOYEE:          "🗑️ ሠራተኛ ተሰረዘ",
  // Offences
  RECORD_OFFENCE:           "⚠️ ጥፋት ሰነድ ሆነ",
  LIFT_SUSPENSION:          "🔓 ታግዱ ተነሳ",
  // Attendance
  SAVE_ATTENDANCE:          "🕐 የመገኘት ሁኔታ ተቀመጠ",
  // Materials
  RECEIVE_STOCK:            "📦 ጥሬ ዕቃ ገባ",
  ISSUE_STOCK:              "📤 ጥሬ ዕቃ ወጣ",
  // Settings
  UPDATE_SETTING:           "⚙️ ቅንብር ተቀየረ",
  SET_DATE_OVERRIDE:        "📅 ቀን ተስተካከለ",
  CLEAR_DATE_OVERRIDE:      "📅 የቀን ማሻሻያ ተሰረዘ",
  // Users
  CREATE_USER:              "👥 ተጠቃሚ ተፈጠረ",
  UPDATE_USER:              "✏️ ተጠቃሚ ተቀየረ",
  RESET_PIN:                "🔑 ፒን ተቀየረ",
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    user?: string;
    action?: string;
    entity?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "audit:view");

  const params  = await searchParams;
  const page    = Math.max(1, parseInt(params.page ?? "1", 10));
  const skip    = (page - 1) * PAGE_SIZE;

  const where: Prisma.AuditLogWhereInput = {
    ...(params.user   ? { user: { employeeCode: { contains: params.user.toUpperCase() } } } : {}),
    ...(params.action ? { action: { contains: params.action } }  : {}),
    ...(params.entity ? { entity: { contains: params.entity } }  : {}),
    ...(params.from || params.to
      ? {
          createdAt: {
            ...(params.from ? { gte: new Date(params.from + "T00:00:00Z") } : {}),
            ...(params.to   ? { lte: new Date(params.to   + "T23:59:59Z") } : {}),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        user: { select: { employeeCode: true, role: true } },
      },
    }),
    db.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const distinctActions = await db.auditLog.findMany({
    select:  { action: true },
    distinct: ["action"],
    orderBy: { action: "asc" },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="erp-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wider font-ethiopic">
          <ScrollText size={14} />
          <span>ስርዓት ምዝገባ</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">{am.audit.title}</h1>
        <p className="text-slate-500 text-sm mt-0.5 font-ethiopic">
          {total.toLocaleString()} ምዝግቦች — አንብብ ብቻ (append-only)
        </p>
      </div>

      {/* Filters */}
      <div className="erp-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={14} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-600 font-ethiopic">ማጣሪያ</span>
        </div>
        <form method="GET" className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-ethiopic">{am.audit.user}</label>
            <input name="user" defaultValue={params.user ?? ""}
              placeholder="EMP-001"
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase bg-white" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-ethiopic">{am.audit.action}</label>
            <select name="action" defaultValue={params.action ?? ""}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-ethiopic bg-white">
              <option value="">ሁሉም</option>
              {distinctActions.map((a) => (
                <option key={a.action} value={a.action}>
                  {ACTION_LABELS[a.action] ?? a.action}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-ethiopic">ከ</label>
            <input type="date" name="from" defaultValue={params.from ?? ""}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-ethiopic">እስከ</label>
            <input type="date" name="to" defaultValue={params.to ?? ""}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
          <button type="submit"
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-ethiopic hover:bg-blue-700 transition-colors font-semibold">
            {am.filter}
          </button>
          <a href="/audit"
            className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-ethiopic hover:bg-slate-200 transition-colors">
            ሁሉም
          </a>
        </form>
      </div>

      {/* Log table */}
      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead>
              <tr>
                <th className="w-36">{am.audit.timestamp}</th>
                <th className="w-28">{am.audit.user}</th>
                <th className="w-20">ሚና</th>
                <th>{am.audit.action}</th>
                <th className="w-32">{am.audit.entity}</th>
                <th className="w-14">ሥ.አ.?</th>
                <th>{am.audit.reason}</th>
                <th>{am.audit.after}</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-slate-400 py-12 font-ethiopic">
                    {am.noData}
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="tabular-nums text-xs text-slate-500 whitespace-nowrap">
                    <span className="block font-medium">{formatAsEthDate(log.createdAt)}</span>
                    <span className="text-slate-400">
                      {log.createdAt.toLocaleTimeString("en-ET", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </td>
                  <td className="font-mono text-xs font-bold text-slate-700">
                    {log.user.employeeCode}
                  </td>
                  <td className="text-xs">
                    <span className="font-ethiopic text-slate-500 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                      {am.roles[log.user.role as keyof typeof am.roles] ?? log.user.role}
                    </span>
                  </td>
                  <td className="font-ethiopic text-slate-800 py-3">
                    <span title={log.action}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="text-xs">
                    <span className="text-slate-600">{log.entity}</span>
                    <span className="block font-mono text-slate-400 text-[10px] truncate max-w-[120px]">
                      {log.entityId.slice(0, 12)}…
                    </span>
                  </td>
                  <td className="text-center text-green-600 font-bold">
                    {log.actedAsManager ? "✓" : ""}
                  </td>
                  <td className="font-ethiopic text-xs text-slate-600 max-w-[120px]">
                    {log.reason ?? ""}
                  </td>
                  <td className="text-xs">
                    {log.after ? (
                      <details className="cursor-pointer">
                        <summary className="text-blue-500 hover:text-blue-700 font-semibold">JSON</summary>
                        <pre className="text-[10px] text-slate-500 mt-1 whitespace-pre-wrap max-w-[200px] overflow-auto">
                          {JSON.stringify(log.after, null, 2)}
                        </pre>
                      </details>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-ethiopic">
              {am.page} {page} {am.of} {totalPages}
              <span className="ml-2 text-slate-400">({total.toLocaleString()} ምዝግቦች)</span>
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <PaginationLink page={page - 1} params={params} label={am.previous} icon="prev" />
              )}
              {page < totalPages && (
                <PaginationLink page={page + 1} params={params} label={am.next} icon="next" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PaginationLink({
  page, params, label, icon,
}: {
  page: number;
  params: Record<string, string | undefined>;
  label: string;
  icon: "prev" | "next";
}) {
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  if (params.user)   qs.set("user",   params.user);
  if (params.action) qs.set("action", params.action);
  if (params.from)   qs.set("from",   params.from);
  if (params.to)     qs.set("to",     params.to);

  return (
    <a href={`/audit?${qs}`}
      className="flex items-center gap-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-ethiopic hover:bg-slate-200 transition-colors font-semibold">
      {icon === "prev" && <ChevronLeft size={14} />}
      {label}
      {icon === "next" && <ChevronRight size={14} />}
    </a>
  );
}
