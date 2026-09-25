import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import Link from "next/link";
import { UserPlus } from "lucide-react";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "users:manage");

  const users = await db.appUser.findMany({
    include: { employee: { select: { nameAm: true, department: { select: { nameAm: true } } } } },
    orderBy: [{ role: "asc" }, { employeeCode: "asc" }],
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">ተጠቃሚዎች</h1>
          <p className="text-gray-500 text-sm mt-0.5 font-ethiopic">{users.length} አጠቃላይ</p>
        </div>
        <Link href="/users/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors font-ethiopic">
          <UserPlus size={16} /> ተጠቃሚ ጨምር
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
            {users.map((u) => (
              <tr key={u.id} className={!u.isActive ? "opacity-50" : ""}>
                <td className="font-mono text-xs font-bold text-gray-700">{u.employeeCode}</td>
                <td className="font-ethiopic text-gray-800">{u.employee?.nameAm ?? "—"}</td>
                <td className="font-ethiopic text-gray-500 text-xs">{u.employee?.department?.nameAm ?? "—"}</td>
                <td>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-ethiopic">
                    {am.roles[u.role as keyof typeof am.roles] ?? u.role}
                  </span>
                </td>
                <td>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-ethiopic ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {u.isActive ? "ንቁ" : "ተዘጋ"}
                  </span>
                </td>
                <td className="text-xs text-gray-400">
                  {u.lastLoginAt ? formatAsEthDate(u.lastLoginAt) : "—"}
                </td>
                <td>
                  <div className="flex gap-2 justify-center">
                    <Link href={`/users/${u.id}/edit`}
                      className="text-xs text-blue-600 hover:underline font-ethiopic">{am.edit}</Link>
                    <Link href={`/users/${u.id}/reset-pin`}
                      className="text-xs text-amber-600 hover:underline font-ethiopic">ፒን ቀይር</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
