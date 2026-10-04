import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { todayISOStringEAT } from "@/lib/ethiopian-calendar";
import { createCutJob } from "../actions";
import Link from "next/link";
import { Scissors, ArrowRight, Info, AlertTriangle } from "lucide-react";
import { CutJobSubmitButton } from "./submit-button";

export default async function NewCutJobPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "/cutting");

  const params = await searchParams;

  // Active orders with lines
  const orders = await db.prodOrder.findMany({
    where: { status: "ACTIVE" },
    include: { lines: true },
    orderBy: { createdAt: "desc" },
  });

  // Fabric materials from store with current stock
  const fabricMaterials = await db.material.findMany({
    where: { isActive: true },
    include: {
      stockMovements: {
        select: { type: true, quantity: true },
      },
    },
    orderBy: { nameAm: "asc" },
  });

  const fabricsWithStock = fabricMaterials.map((f) => {
    let stock = 0;
    for (const m of f.stockMovements) {
      const q = Number(m.quantity);
      if (m.type === "RECEIVE" || m.type === "RETURN") stock += q;
      else stock -= q;
    }
    return {
      id: f.id,
      nameAm: f.nameAm,
      sku: f.sku,
      unit: f.unit,
      stock: Math.max(0, stock),
    };
  });

  // Limit setting
  const limitSetting = await db.appSetting.findUnique({
    where: { key: "cutting_wastage_limit" },
  });
  const limit = limitSetting ? parseFloat(limitSetting.value) : 1.0;

  const today = todayISOStringEAT();

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Top Navigation Link */}
      <div>
        <Link
          href="/cutting"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors font-ethiopic"
        >
          <ArrowRight size={14} className="rotate-180" />
          <span>ወደ ቆረጣ ክፍል ተመለስ</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="erp-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-wider font-ethiopic">
          <Scissors size={14} />
          <span>አዲስ የቆረጣ ምዝገባ</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          {am.cutting.newCutJob}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5 font-ethiopic">
          የተሰጠ ጨርቅ ሚዛን (ኪ.ግ) እና የተቆረጡ ፍሬዎች ምዝገባ (የተፈቀደ የፍጆታ ወሰን፦ {limit.toFixed(2)} ኪ.ግ/ፍሬ)
        </p>
      </div>

      {/* Form Card */}
      <form action={createCutJob} className="erp-card p-6 md:p-8 space-y-5">
        {/* Order Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            የምርት ትዕዛዝ <span className="text-rose-500">*</span>
          </label>
          <select
            name="orderId"
            required
            defaultValue={params.orderId ?? ""}
            className="input-field font-ethiopic text-slate-800"
          >
            <option value="">የትዕዛዝ ቁጥር ይምረጡ</option>
            {orders.map((o) => {
              const totalQty = o.lines.reduce((s, l) => s + l.qty, 0);
              return (
                <option key={o.id} value={o.id}>
                  {o.orderNo} ({totalQty} ፍሬ)
                </option>
              );
            })}
          </select>
        </div>

        {/* Fabric from store */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            ጨርቅ (ከመጋዘን) <span className="text-rose-500">*</span>
          </label>
          <select
            name="fabricId"
            required
            className="input-field font-ethiopic text-slate-800"
          >
            <option value="">የጨርቅ አይነት ይምረጡ</option>
            {fabricsWithStock.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nameAm} ({f.sku}) — በመጋዘን ያለው፦ {f.stock.toFixed(1)} {f.unit}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 font-ethiopic mt-1">
            የተሰጠው ጨርቅ ሚዛን ከመጋዘን ካለው ክምችት በላይ ከሆነ ስርዓቱ አይፈቅድም።
          </p>
        </div>

        {/* Weight Issued / Received (kg) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            የተሰጠ ጨርቅ ሚዛን (ኪ.ግ) <span className="text-rose-500">*</span>
          </label>
          <input
            name="kgReceived"
            type="number"
            step="0.001"
            min="0.001"
            required
            placeholder="ምሳሌ፦ 45.5"
            className="input-field tabular-nums text-slate-800 font-bold"
          />
        </div>

        {/* Pieces Cut */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            የተቆረጡ ፍሬዎች ብዛት <span className="text-rose-500">*</span>
          </label>
          <input
            name="piecesCut"
            type="number"
            min="1"
            required
            placeholder="ምሳሌ፦ 200"
            className="input-field tabular-nums text-slate-800 font-bold"
          />
        </div>

        {/* Cut Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            የተቆረጠበት ቀን <span className="text-rose-500">*</span>
          </label>
          <input
            name="date"
            type="date"
            defaultValue={today}
            required
            className="input-field text-slate-800"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.notes} (ማስታወሻ)
          </label>
          <textarea
            name="notes"
            rows={2}
            className="input-field font-ethiopic text-slate-800 resize-none"
            placeholder="ተጨማሪ ማብራሪያ ካለ እዚህ ይጻፉ..."
          />
        </div>

        {/* Calculation Info Box */}
        <div className="rounded-xl bg-orange-50/70 border border-orange-200/80 p-3.5 space-y-1.5 text-xs text-orange-950 font-ethiopic">
          <div className="flex items-center gap-1.5 font-bold text-orange-800">
            <Info size={14} />
            <span>የብክነት ስሌት ቀመር (Consumption Formula)፦</span>
          </div>
          <p className="leading-relaxed">
            ፍጆታ = የተሰጠ ጨርቅ ሚዛን (ኪ.ግ) ÷ የተቆረጡ ፍሬዎች ብዛት። መልሱ ከተፈቀደው ወሰን ({limit.toFixed(2)} ኪ.ግ/ፍሬ) በላይ ከሆነ በስርዓቱ ውስጥ የብክነት ማስጠንቀቂያ በራስ-ሰር ይፈጠራል።
          </p>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <CutJobSubmitButton />
        </div>
      </form>
    </div>
  );
}
