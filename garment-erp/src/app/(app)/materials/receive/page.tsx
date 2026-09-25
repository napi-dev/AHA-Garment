import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { recordMovement } from "../actions";

export default async function ReceiveMaterialPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "stock:edit");

  const materials = await db.material.findMany({ where: { isActive: true }, orderBy: { sku: "asc" } });
  const suppliers = await db.supplier.findMany({ where: { isActive: true }, orderBy: { nameAm: "asc" } });
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{am.materials.receive}</h1>
      <form action={recordMovement} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <input type="hidden" name="type" value="RECEIVE" />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">{am.materials.name} <span className="text-red-500">*</span></label>
          <select name="materialId" required className="input-field font-ethiopic">
            <option value="">ጥሬ እቃ ምረጥ</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>{m.nameAm} ({m.sku})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">{am.materials.quantity} <span className="text-red-500">*</span></label>
          <input name="quantity" type="number" step="0.001" min="0.001" required className="input-field tabular-nums" placeholder="0.000" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">{am.date}</label>
          <input name="date" type="date" defaultValue={today} className="input-field" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">{am.materials.supplier}</label>
          <select name="supplierId" className="input-field font-ethiopic">
            <option value="">አቅራቢ ምረጥ (አማራጭ)</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.nameAm}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">{am.materials.lot}</label>
          <input name="lotNumber" className="input-field" placeholder="LOT-001 (አማራጭ)" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">{am.notes}</label>
          <textarea name="notes" rows={2} className="input-field font-ethiopic resize-none" placeholder="ማስታወሻ..." />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 py-3 bg-green-600 text-white rounded-xl font-ethiopic font-semibold hover:bg-green-700">{am.materials.receive}</button>
          <a href="/materials" className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-ethiopic font-semibold text-center hover:bg-gray-200">{am.cancel}</a>
        </div>
      </form>
    </div>
  );
}
