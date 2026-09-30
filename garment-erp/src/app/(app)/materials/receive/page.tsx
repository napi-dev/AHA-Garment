import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { todayISOStringEAT } from "@/lib/ethiopian-calendar";
import { recordMovement } from "../actions";
import Link from "next/link";
import { ArrowDownLeft, ArrowRight, Save, PackagePlus } from "lucide-react";

export default async function ReceiveMaterialPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "stock:edit");

  const [materials, suppliers] = await Promise.all([
    db.material.findMany({ where: { isActive: true }, orderBy: { sku: "asc" } }),
    db.supplier.findMany({ where: { isActive: true }, orderBy: { nameAm: "asc" } }),
  ]);
  const today = todayISOStringEAT();

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Top Navigation Link */}
      <div>
        <Link
          href="/materials"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors font-ethiopic"
        >
          <ArrowRight size={14} className="rotate-180" />
          <span>ወደ ጥሬ ዕቃዎች ዝርዝር ተመለስ</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="erp-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider font-ethiopic">
          <ArrowDownLeft size={14} />
          <span>የመጋዘን ገቢ ምዝገባ</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          {am.materials.receive}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5 font-ethiopic">
          ከአቅራቢዎች ወይም ከግዢ የገባን ጥሬ ዕቃ ወደ መጋዘን ክምችት ይመዝግቡ
        </p>
      </div>

      {/* Form Card */}
      <form action={recordMovement} className="erp-card p-6 md:p-8 space-y-5">
        <input type="hidden" name="type" value="RECEIVE" />

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.materials.name} <span className="text-rose-500">*</span>
          </label>
          <select name="materialId" required className="input-field font-ethiopic text-slate-800">
            <option value="">የጥሬ ዕቃ አይነት ይምረጡ</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nameAm} ({m.sku}) — {m.unit}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.materials.quantity} (የገቢ መጠን) <span className="text-rose-500">*</span>
          </label>
          <input
            name="quantity"
            type="number"
            step="0.001"
            min="0.001"
            required
            className="input-field tabular-nums"
            placeholder="0.000"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            የገቢ ቀን
          </label>
          <input
            name="date"
            type="date"
            defaultValue={today}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.materials.supplier} (አማራጭ)
          </label>
          <select name="supplierId" className="input-field font-ethiopic text-slate-800">
            <option value="">አቅራቢ ድርጅት ይምረጡ (አማራጭ)</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.nameAm}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.materials.lot} (የሎት ቁጥር - አማራጭ)
          </label>
          <input
            name="lotNumber"
            className="input-field"
            placeholder="ምሳሌ፦ LOT-2026-001"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.notes} (ማስታወሻ)
          </label>
          <textarea
            name="notes"
            rows={2}
            className="input-field font-ethiopic resize-none"
            placeholder="ተጨማሪ ማስታወሻ ወይም የመላኪያ ደረሰኝ ቁጥር..."
          />
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            className="btn-primary flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 font-ethiopic"
          >
            <PackagePlus size={16} />
            <span>ዕቃ ገቢ አድርግ</span>
          </button>
          <Link
            href="/materials"
            className="btn-secondary px-6 font-ethiopic text-center"
          >
            {am.cancel}
          </Link>
        </div>
      </form>
    </div>
  );
}
