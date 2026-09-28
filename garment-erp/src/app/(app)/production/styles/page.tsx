import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import Link from "next/link";
import { createStyle } from "../actions";
import { Shirt, Plus, Layers, ArrowLeft } from "lucide-react";

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
    <div className="space-y-6">
      {/* Header */}
      <div className="erp-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider font-ethiopic">
            <Shirt size={14} />
            <span>ምርት ክፍል — ስታይሎች</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">የልብስ ስታይሎች</h1>
          <p className="text-slate-500 text-sm mt-0.5 font-ethiopic">
            ሁሉም ንቁ ስታይሎች፣ BOM እቃዎች እና ትዕዛዞቻቸው
          </p>
        </div>
        <Link href="/production"
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-ethiopic transition-colors">
          <ArrowLeft size={14} /> ወደ ምርት
        </Link>
      </div>

      {/* Add style form */}
      {canEdit && (
        <div className="erp-card p-6">
          <h2 className="text-sm font-semibold text-slate-700 font-ethiopic mb-4 flex items-center gap-2">
            <Plus size={14} className="text-indigo-600" /> አዲስ ስታይል ጨምር
          </h2>
          <form action={createStyle} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-slate-500 mb-1.5 font-ethiopic">ስም (አማርኛ) *</label>
              <input name="nameAm" required placeholder="ቲሸርት — ስኩዌር"
                className="input-field font-ethiopic" />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs text-slate-500 mb-1.5">English Name</label>
              <input name="nameEn" placeholder="T-Shirt Square" className="input-field" />
            </div>
            <button type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-ethiopic hover:bg-indigo-700 transition-colors font-semibold">
              <Plus size={15} /> ጨምር
            </button>
          </form>
        </div>
      )}

      {/* Styles grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {styles.length === 0 && (
          <div className="col-span-3 erp-card p-12 text-center">
            <Shirt size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 font-ethiopic">ምንም ስታይል አልተመዘገበም</p>
          </div>
        )}
        {styles.map((s) => (
          <Link key={s.id} href={`/production/styles/${s.id}`}
            className="erp-card p-5 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-slate-900 font-ethiopic group-hover:text-indigo-700 transition-colors">{s.nameAm}</p>
                {s.nameEn && <p className="text-sm text-slate-500 mt-0.5">{s.nameEn}</p>}
                <p className="text-xs text-slate-400 font-mono mt-1">{s.code}</p>
              </div>
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-ethiopic font-semibold">
                {s._count.prodOrders} ትዕዛዝ
              </span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500 font-ethiopic">
              <Layers size={12} />
              BOM: {s._count.bomItems} ጥሬ እቃዎች
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
