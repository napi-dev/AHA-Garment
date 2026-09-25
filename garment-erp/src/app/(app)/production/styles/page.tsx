import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import Link from "next/link";
import { createStyle } from "../actions";
import { Plus } from "lucide-react";

export default async function StylesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "bundles:view");

  const styles = await db.garmentStyle.findMany({
    where: { isActive: true },
    include: { _count: { select: { bomItems: true, prodOrders: true } } },
    orderBy: { createdAt: "desc" },
  });

  const canEdit = ["ADMIN","SUPER_MANAGER","CUTTING_MANAGER","PRODUCTION_MANAGER"].includes(session.user.role);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">ስታይሎች</h1>
        <Link href="/production" className="text-sm text-gray-500 hover:underline font-ethiopic">← ምርት</Link>
      </div>

      {canEdit && (
        <form action={createStyle} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-gray-500 mb-1 font-ethiopic">ስም (አማርኛ) *</label>
            <input name="nameAm" required placeholder="ቲሸርት — ስኩዌር" className="input-field font-ethiopic" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs text-gray-500 mb-1">English name</label>
            <input name="nameEn" placeholder="T-Shirt Square" className="input-field" />
          </div>
          <button type="submit"
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-ethiopic hover:bg-blue-700">
            <Plus size={15} /> ጨምር
          </button>
        </form>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {styles.length === 0 && (
          <p className="text-gray-400 font-ethiopic col-span-3 text-center py-10">ምንም ስታይል የለም</p>
        )}
        {styles.map((s) => (
          <Link key={s.id} href={`/production/styles/${s.id}`}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-gray-900 font-ethiopic">{s.nameAm}</p>
                {s.nameEn && <p className="text-sm text-gray-500 mt-0.5">{s.nameEn}</p>}
                <p className="text-xs text-gray-400 font-mono mt-1">{s.code}</p>
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-ethiopic">
                {s._count.prodOrders} ትዕዛዞች
              </span>
            </div>
            <div className="mt-3 text-xs text-gray-500 font-ethiopic">
              BOM: {s._count.bomItems} ጥሬ እቃዎች
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
