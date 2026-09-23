import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";

const PAGE_SIZE = 50;

// Human-readable action labels
const ACTION_LABELS: Record<string, string> = {
  SAVE_HOURLY_COUNT:        "ቁጥር አስቀምጦ",
  VERIFY_COUNT:             "ቁጥር አረጋግጧል",
  CLOSE_DAY:                "ቀን ዘጋ",
  CLOSE_INCENTIVE_PERIOD:   "ወቅት ዘጋ",
  APPROVE_INCENTIVE_PERIOD: "ወቅት አፀደቀ",
  SET_SALARY:               "ደሞዝ ቀየረ",
  APPROVE_SALARY_SCHEDULE:  "ደሞዝ ሰሌዳ አፀደቀ",
  CREATE_EMPLOYEE:          "ሠራተኛ ፈጠረ",
  UPDATE_EMPLOYEE:          "ሠራተኛ አስተካከለ",
  RECORD_OFFENCE:           "ጥፋት ሰነደ",
  LIFT_SUSPENSION:          "ታግዱ አነሳ",
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

  // Build filter
  const where: Parameters<typeof db.auditLog.findMany>[0]["where"] = {
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

  // Unique actions for filter dropdown
  const distinctActions = await db.auditLog.findMany({
    select:  { action: true },
    distinct: ["action"],
    orderBy: { action: "asc" },
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{am.audit.title}</h1>
        <p className="text-gray-500 text-sm mt-0.5 font-ethiopic">
          {total.toLocaleString()} ምዝግቦች — አንብብ ብቻ (append-only)
        </p>
      </div>

      {/* Filters */}
      <form method="GET"
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-ethiopic">{am.audit.user}</label>
          <input name="user" defaultValue={params.user ?? ""}
            placeholder="EMP-001"
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-ethiopic">{am.audit.action}</label>
          <select name="action" defaultValue={params.action ?? ""}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-ethiopic">
            <option value="">ሁሉም</option>
            {distinctActions.map((a) => (
              <option key={a.action} value={a.action}>
                {ACTION_LABELS[a.action] ?? a.action}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-ethiopic">ከ</label>
          <input type="date" name="from" defaultValue={params.from ?? ""}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-ethiopic">እስከ</label>
          <input type="date" name="to" defaultValue={params.to ?? ""}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-ethiopic hover:bg-blue-700 transition-colors">
          {am.filter}
        </button>
        <a href="/audit"
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-ethiopic hover:bg-gray-200 transition-colors">
          ሁሉም
        </a>
      </form>

      {/* Log table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                  <td colSpan={8} className="text-center text-gray-400 py-12 font-ethiopic">
                    {am.noData}
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  {/* Timestamp */}
                  <td className="tabular-nums text-xs text-gray-500 whitespace-nowrap">
                    <span className="block">{formatAsEthDate(log.createdAt)}</span>
                    <span className="text-gray-400">
                      {log.createdAt.toLocaleTimeString("en-ET", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </td>

                  {/* User */}
                  <td className="font-mono text-xs font-medium text-gray-700">
                    {log.user.employeeCode}
                  </td>

                  {/* Role */}
                  <td className="text-xs">
                    <span className="font-ethiopic text-gray-500">
                      {am.roles[log.user.role as keyof typeof am.roles] ?? log.user.role}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="font-ethiopic text-gray-800">
                    {ACTION_LABELS[log.action] ?? log.action}
                    <span className="block text-xs text-gray-400 font-mono">{log.action}</span>
                  </td>

                  {/* Entity */}
                  <td className="text-xs">
                    <span className="text-gray-600">{log.entity}</span>
                    <span className="block font-mono text-gray-400 text-[10px] truncate max-w-[120px]">
                      {log.entityId.slice(0, 12)}…
                    </span>
                  </td>

                  {/* Acted as manager */}
                  <td className="text-center text-lg">
                    {log.actedAsManager ? "✓" : ""}
                  </td>

                  {/* Reason */}
                  <td className="font-ethiopic text-xs text-gray-600 max-w-[120px]">
                    {log.reason ?? ""}
                  </td>

                  {/* After value — collapsed JSON */}
                  <td className="text-xs">
                    {log.after ? (
                      <details className="cursor-pointer">
                        <summary className="text-blue-500 hover:text-blue-700">JSON</summary>
                        <pre className="text-[10px] text-gray-500 mt-1 whitespace-pre-wrap max-w-[200px] overflow-auto">
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
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500 font-ethiopic">
              {am.page} {page} {am.of} {totalPages}
              <span className="ml-2 text-gray-400">({total.toLocaleString()} ምዝግቦች)</span>
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <PaginationLink page={page - 1} params={params} label={am.previous} />
              )}
              {page < totalPages && (
                <PaginationLink page={page + 1} params={params} label={am.next} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PaginationLink({
  page, params, label,
}: {
  page: number;
  params: Record<string, string | undefined>;
  label: string;
}) {
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  if (params.user)   qs.set("user",   params.user);
  if (params.action) qs.set("action", params.action);
  if (params.from)   qs.set("from",   params.from);
  if (params.to)     qs.set("to",     params.to);

  return (
    <a href={`/audit?${qs}`}
      className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-ethiopic hover:bg-gray-200 transition-colors">
      {label}
    </a>
  );
}
