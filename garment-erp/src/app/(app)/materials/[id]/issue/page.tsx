import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { todayISOStringEAT } from "@/lib/ethiopian-calendar";
import { recordMovement } from "../../actions";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, Save, PackageMinus } from "lucide-react";

export default async function IssueMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "stock:edit");

  const { id } = await params;
  const material = await db.material.findUnique({ where: { id } });
  if (!material) notFound();

  const orders = await db.prodOrder.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

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
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 uppercase tracking-wider font-ethiopic">
          <ArrowUpRight size={14} />
          <span>የዕቃ ወጪ ምዝገባ (Issue)</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          {material.nameAm}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5 font-ethiopic flex items-center gap-2">
          <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
            {material.sku}
          </span>
          <span>·</span>
          <span>መለኪያ፦ {material.unit}</span>
        </p>
      </div>

      {/* Form Card */}
      <form action={recordMovement} className="erp-card p-6 md:p-8 space-y-5">
        <input type="hidden" name="materialId" value={id} />
        <input type="hidden" name="type" value="ISSUE" />

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.materials.quantity} (የሚወጣው መጠን - {material.unit}) <span className="text-rose-500">*</span>
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
            የወጣበት ቀን
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
            የምርት ትዕዛዝ ማጣቀሻ (አማራጭ)
          </label>
          <select name="reference" className="input-field font-ethiopic text-slate-800">
            <option value="">ትዕዛዝ ይምረጡ (አማራጭ)</option>
            {orders.map((o) => (
              <option key={o.id} value={o.orderNo}>
                {o.orderNo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.notes} (ማስታወሻ)
          </label>
          <textarea
            name="notes"
            rows={2}
            className="input-field font-ethiopic resize-none"
            placeholder="ለየትኛው ክፍል ወይም መስመር እንደወጣ ይግለጹ..."
          />
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            className="btn-primary flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 font-ethiopic"
          >
            <PackageMinus size={16} />
            <span>ዕቃ ለስራ አውጣ</span>
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
