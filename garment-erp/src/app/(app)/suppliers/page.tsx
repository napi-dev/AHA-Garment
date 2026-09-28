import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import Link from "next/link";
import { Truck, Plus, Layers, Phone, Building2 } from "lucide-react";
import { createSupplier } from "./actions";

export default async function SuppliersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "stock:view");

  const suppliers = await db.supplier.findMany({
    where: { isActive: true },
    include: { _count: { select: { lots: true } } },
    orderBy: { nameAm: "asc" },
  });

  const canEdit = ["ADMIN", "SUPER_MANAGER", "STORE_KEEPER"].includes(session.user.role);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="erp-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
            <Truck size={14} />
            <span>የጥሬ ዕቃ አቅራቢዎች</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
            {am.suppliers.title}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-ethiopic">
            የጨርቅና የመለዋወጫ አቅራቢ ድርጅቶች መረጃና የቀረቡ ሎቶች (Lots)
          </p>
        </div>
      </div>

      {/* Inline Add Supplier Form */}
      {canEdit && (
        <form action={createSupplier} className="erp-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider font-ethiopic">
            <Plus size={14} className="text-blue-600" />
            <span>{am.suppliers.newSupplier}</span>
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
                የድርጅት ስም (በአማርኛ) <span className="text-rose-500">*</span>
              </label>
              <input
                name="nameAm"
                required
                placeholder="ምሳሌ፦ ኮምቦልቻ ጨርቃጨርቅ ፋብሪካ"
                className="input-field font-ethiopic"
              />
            </div>

            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                English Name (አማራጭ)
              </label>
              <input
                name="nameEn"
                placeholder="e.g. Kombolcha Textile Share Co."
                className="input-field"
              />
            </div>

            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
                ስልክ ቁጥር
              </label>
              <input
                name="contact"
                placeholder="+251 9..."
                className="input-field"
              />
            </div>

            <button
              type="submit"
              className="btn-primary flex items-center gap-2 px-6 py-3 font-ethiopic h-[46px]"
            >
              <Plus size={16} />
              <span>መዝግብ</span>
            </button>
          </div>
        </form>
      )}

      {/* Suppliers Table */}
      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead>
              <tr>
                <th className="text-right">የአቅራቢ ድርጅት ስም</th>
                <th className="text-right">English Name</th>
                <th className="text-right">ስልክ ቁጥር</th>
                <th className="text-center">የቀረቡ ሎቶች (Lots)</th>
                <th className="text-center">{am.actions}</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-400 font-ethiopic">
                    <Truck size={36} className="mx-auto mb-2 text-slate-300" />
                    <p>ምንም የተመዘገበ አቅራቢ ድርጅት አልተገኘም</p>
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="font-ethiopic font-semibold text-slate-900 text-right py-3.5">
                      {s.nameAm}
                    </td>
                    <td className="text-slate-500 font-sans text-right py-3.5 text-xs">
                      {s.nameEn ?? "—"}
                    </td>
                    <td className="text-slate-600 font-mono text-right py-3.5 text-xs">
                      {s.contact ?? "—"}
                    </td>
                    <td className="text-center tabular-nums py-3.5 font-semibold text-slate-700">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-mono">
                        {s._count.lots} ሎቶች
                      </span>
                    </td>
                    <td className="text-center py-3.5">
                      <Link
                        href={`/suppliers/${s.id}/lots`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 font-ethiopic hover:underline"
                      >
                        <Layers size={13} />
                        <span>ሎቶችን ተመልከት</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
