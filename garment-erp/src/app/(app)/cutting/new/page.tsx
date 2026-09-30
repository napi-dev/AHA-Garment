import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { todayISOStringEAT } from "@/lib/ethiopian-calendar";
import { createCutJob } from "../actions";
import Link from "next/link";
import { Scissors, ArrowRight, Info } from "lucide-react";
import { CutJobSubmitButton } from "./submit-button";

export default async function NewCutJobPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "cuts:edit");

  const params = await searchParams;

  const orders = await db.prodOrder.findMany({
    where: { isActive: true },
    include: { style: { include: { bomItems: { include: { material: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  const selectedOrder = params.orderId
    ? orders.find((o) => o.id === params.orderId)
    : null;

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
          ለተመረጠው ትዕዛዝ የወጣውን ጨርቅ ሚዛንና የተቆረጡትን ፍሬዎች ይመዝግቡ
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
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.orderNumber} — {o.style.nameAm} ({o.quantity.toLocaleString()} ፍሬ)
              </option>
            ))}
          </select>
        </div>

        {/* Weights & Pieces */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
              {am.cutting.weightIssued} <span className="text-rose-500">*</span>
            </label>
            <input
              name="weightIssued"
              type="number"
              step="0.001"
              min="0.001"
              required
              className="input-field tabular-nums"
              placeholder="ምሳሌ፦ 100.000"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
              {am.cutting.weightUsed} <span className="text-rose-500">*</span>
            </label>
            <input
              name="weightUsed"
              type="number"
              step="0.001"
              min="0.001"
              required
              className="input-field tabular-nums"
              placeholder="ምሳሌ፦ 98.000"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
              {am.cutting.piecesCut} <span className="text-rose-500">*</span>
            </label>
            <input
              name="piecesCut"
              type="number"
              min="1"
              required
              className="input-field tabular-nums"
              placeholder="ምሳሌ፦ 380"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
              የሚፈጠሩ ባንድሎች ብዛት
            </label>
            <input
              name="bundleCount"
              type="number"
              min="1"
              defaultValue="1"
              className="input-field tabular-nums"
            />
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.cutting.cuttingDate}
          </label>
          <input
            name="date"
            type="date"
            defaultValue={today}
            className="input-field"
          />
        </div>

        {/* Standard Weight Hint from BOM */}
        {selectedOrder?.style.bomItems[0] && (
          <div className="alert-info text-xs font-ethiopic flex items-start gap-2.5">
            <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">የስታይሉ መደበኛ የጨርቅ ፍጆታ (BOM)፦</p>
              <p className="text-blue-700 mt-0.5">
                በአንድ ፍሬ {Number(selectedOrder.style.bomItems[0].qtyPerPiece).toFixed(4)} {selectedOrder.style.bomItems[0].unit}
              </p>
            </div>
          </div>
        )}

        <div className="pt-2 flex items-center gap-3">
          <CutJobSubmitButton />
          <Link
            href="/cutting"
            className="btn-secondary px-6 font-ethiopic text-center"
          >
            {am.cancel}
          </Link>
        </div>

        <div className="text-[11px] text-slate-400 font-ethiopic text-center pt-1 border-t border-slate-100">
          የብክነት ስሌት ቀመር፦ ((የወጣ ጨርቅ − (ፍሬዎች × BOM)) ÷ የወጣ ጨርቅ) × 100
          <br />ብክነቱ ከ 5% በላይ ከሆነ በስርዓቱ ውስጥ ማስጠንቀቂያ ይፈጠራል።
        </div>
      </form>
    </div>
  );
}
