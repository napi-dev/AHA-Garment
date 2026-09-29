import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import Link from "next/link";
import { Users, UserPlus, Shield } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 20;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "users:manage");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const where = params.q
    ? { employeeCode: { contains: params.q.toUpperCase() } }
    : {};

  const [users, total, totalActive] = await Promise.all([
    db.appUser.findMany({
      where,
      include: { employee: { select: { nameAm: true, department: { select: { nameAm: true } } } } },
      orderBy: [{ role: "asc" }, { employeeCode: "asc" }],
      skip,
      take: PAGE_SIZE,
    }),
    db.appUser.count({ where }),
    db.appUser.count({ where: { isActive: true } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function buildHref(p: number) {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    sp.set("page", String(p));
    return `/users?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="erp-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
            <Users size={14} />
            <span>ስርዓት አስተዳደር</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">ተጠቃሚዎች</h1>
          <p className="text-slate-500 text-sm mt-0.5 font-ethiopic">
            {totalActive} ንቁ · {total} አጠቃላይ ተጠቃሚዎች
          </p>
        </div>
        <Link href="/users/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors font-ethiopic shadow-sm">
          <UserPlus size={16} /> አዲስ ተጠቃሚ ጨምር
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="erp-card p-5">
          <p className="text-xs text-slate-500 font-ethiopic mb-1.5">አጠቃላይ</p>
          <p className="text-3xl font-bold tabular-nums text-slate-800">{total}</p>
        </div>
        <div className="erp-card p-5">
          <p className="text-xs text-slate-500 font-ethiopic mb-1.5">ንቁ ተጠቃሚዎች</p>
          <p className="text-3xl font-bold tabular-nums text-green-700">{totalActive}</p>
        </div>
        <div className="erp-card p-5">
          <p className="text-xs text-slate-500 font-ethiopic mb-1.5">የተዘጉ</p>
          <p className="text-3xl font-bold tabular-nums text-slate-400">{total - totalActive}</p>
        </div>
      </div>

      {/* Search */}
      <div className="erp-card p-4">
        <form method="GET" className="flex gap-3">
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="በኮድ ፈልግ..."
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
          />
          <button type="submit" className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors font-ethiopic">
            ፈልግ
          </button>
          {params.q && (
            <Link href="/users" className="px-3 py-2.5 text-xs text-slate-500 hover:text-slate-800 font-ethiopic self-center">ሰርዝ</Link>
          )}
        </form>
      </div>

      {/* Users table */}
      <div className="erp-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Shield size={15} className="text-slate-400" />
          <span className="font-semibold text-slate-700 font-ethiopic text-sm">ተጠቃሚዎች ዝርዝር</span>
        </div>
        <table className="w-full text-sm data-table">
          <thead>
            <tr>
              <th>ኮድ</th>
              <th>ስም</th>
              <th>ክፍል</th>
              <th>ሚና</th>
              <th>ሁኔታ</th>
              <th>የመጨረሻ ሎጊን</th>
              <th>{am.actions}</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400 font-ethiopic">
                  ምንም ተጠቃሚ አልተገኘም
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className={!u.isActive ? "opacity-50" : ""}>
                <td className="font-mono text-xs font-bold text-slate-700">{u.employeeCode}</td>
                <td className="font-ethiopic text-slate-800 font-medium">{u.employee?.nameAm ?? "—"}</td>
                <td className="font-ethiopic text-slate-500 text-xs">{u.employee?.department?.nameAm ?? "—"}</td>
                <td>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-ethiopic font-semibold">
                    {am.roles[u.role as keyof typeof am.roles] ?? u.role}
                  </span>
                </td>
                <td>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-ethiopic font-semibold ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {u.isActive ? "ንቁ" : "ተዘጋ"}
                  </span>
                </td>
                <td className="text-xs text-slate-400">
                  {u.lastLoginAt ? formatAsEthDate(u.lastLoginAt) : "—"}
                </td>
                <td>
                  <div className="flex gap-3 justify-center">
                    <Link href={`/users/${u.id}/edit`}
                      className="text-xs text-blue-600 hover:text-blue-800 font-ethiopic font-semibold">{am.edit}</Link>
                    <Link href={`/users/${u.id}/reset-pin`}
                      className="text-xs text-amber-600 hover:text-amber-800 font-ethiopic font-semibold">ፒን ቀይር</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 font-ethiopic">
          ከ {total} ተጠቃሚዎች ውስጥ {users.length} ቀርበዋል
        </div>
        <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
      </div>
    </div>
  );
}
