import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { createCutJob } from "../actions";

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

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">ቆርጦ ጀምር</h1>

      <form action={createCutJob} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        {/* Order */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">ትዕዛዝ *</label>
          <select name="orderId" required defaultValue={params.orderId ?? ""}
            className="input-field font-ethiopic">
            <option value="">ምረጥ</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>{o.orderNumber} — {o.style.nameAm} ({o.quantity.toLocaleString()} ፍሬ)</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Weight issued */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">የተሰጠ ጨርቅ (ኪ.ግ) *</label>
            <input name="weightIssued" type="number" step="0.001" min="0.001" required
              className="input-field tabular-nums" placeholder="100.000" />
          </div>
          {/* Weight used */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">የወጣ ጨርቅ (ኪ.ግ) *</label>
            <input name="weightUsed" type="number" step="0.001" min="0.001" required
              className="input-field tabular-nums" placeholder="98.000" />
          </div>
          {/* Pieces cut */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">የተቆረጡ ፍሬዎች *</label>
            <input name="piecesCut" type="number" min="1" required
              className="input-field tabular-nums" placeholder="380" />
          </div>
          {/* Bundles to create */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">ባንድሎች ብዛት</label>
            <input name="bundleCount" type="number" min="1" defaultValue="1"
              className="input-field tabular-nums" />
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">ቀን</label>
          <input name="date" type="date" defaultValue={today} className="input-field" />
        </div>

        {/* Standard weight hint (from BOM) */}
        {selectedOrder?.style.bomItems[0] && (
          <div className="bg-blue-50 rounded-xl p-4 text-sm font-ethiopic text-blue-700">
            BOM: {Number(selectedOrder.style.bomItems[0].qtyPerPiece).toFixed(4)} {selectedOrder.style.bomItems[0].unit} / ፍሬ
            <span className="ml-2 text-blue-500 text-xs">(ብክነት ለማስሊያ ይጠቀሙ)</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit"
            className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-ethiopic font-semibold hover:bg-orange-600">
            አስቀምጥ
          </button>
          <a href="/cutting"
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-ethiopic font-semibold text-center hover:bg-gray-200">
            ሰርዝ
          </a>
        </div>
      </form>

      {/* Live wastage preview note */}
      <p className="text-xs text-gray-400 font-ethiopic text-center">
        ብክነት = (የወጣ − (ፍሬዎች × BOM ሚዛን)) ÷ የወጣ × 100
        <br />ከ 5% በላይ ከሆነ ወዲያውኑ ማስጠንቀቂያ ይላካል።
      </p>
    </div>
  );
}
