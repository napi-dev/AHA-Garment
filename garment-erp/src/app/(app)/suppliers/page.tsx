import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import Link from "next/link";
import { Plus } from "lucide-react";
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

  const canEdit = ["ADMIN","SUPER_MANAGER","STORE_KEEPER"].includes(session.user.role);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">አቅራቢዎች</h1>
        {canEdit && (
          <button
            onClick={undefined}
            className="hidden"
          />
        )}
      </div>

      {/* Inline add form */}
      {canEdit && (
        <form action={createSupplier} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-gray-500 mb-1 font-ethiopic">ስም (አማርኛ) *</label>
            <input name="nameAm" required placeholder="አቅራቢ ስም" className="input-field font-ethiopic" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-gray-500 mb-1">English name</label>
            <input name="nameEn" placeholder="Supplier name" className="input-field" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-gray-500 mb-1 font-ethiopic">ስልክ</label>
            <input name="contact" placeholder="+251..." className="input-field" />
          </div>
          <button type="submit"
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-ethiopic hover:bg-blue-700 transition-colors">
            <Plus size={15} /> ጨምር
          </button>
        </form>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm data-table">
          <thead>
            <tr>
              <th>ስም</th>
              <th>English</th>
              <th>ስልክ</th>
              <th className="w-20">ሎቶች</th>
              {canEdit && <th className="w-24">{am.actions}</th>}
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400 font-ethiopic">{am.noData}</td></tr>
            )}
            {suppliers.map((s) => (
              <tr key={s.id}>
                <td className="font-ethiopic font-medium text-gray-800">{s.nameAm}</td>
                <td className="text-gray-600">{s.nameEn ?? "—"}</td>
                <td className="text-gray-500">{s.contact ?? "—"}</td>
                <td className="text-center tabular-nums">{s._count.lots}</td>
                {canEdit && (
                  <td>
                    <Link href={`/suppliers/${s.id}/lots`}
                      className="text-xs text-blue-600 hover:underline font-ethiopic">ሎቶች</Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
