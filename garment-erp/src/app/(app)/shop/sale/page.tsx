import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { ShopSaleForm } from "./sale-form";
import Link from "next/link";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";

export const dynamic = "force-dynamic";

export default async function ShopSalePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  requirePermission(session.user.role, "/shop/sale");

  // Fetch all movements to compute available stock per SKU
  const movements = await db.shopMovement.findMany({
    where: { voidedAt: null },
    orderBy: { createdAt: "desc" },
  });

  const skuMap = new Map<string, { typeId: string; color: string; size: string; balance: number }>();

  for (const m of movements) {
    const key = `${m.typeId}__${m.color}__${m.size}`;
    let row = skuMap.get(key);
    if (!row) {
      row = { typeId: m.typeId, color: m.color, size: m.size, balance: 0 };
      skuMap.set(key, row);
    }
    if (m.type === "RECEIVE") row.balance += m.qty;
    else if (m.type === "SALE") row.balance -= m.qty;
    else if (m.type === "RETURN") row.balance -= m.qty;
  }

  // Filter only SKUs with balance > 0
  const availableSkus = Array.from(skuMap.values()).filter((s) => s.balance > 0);

  // Recent sales
  const recentSales = movements.filter((m) => m.type === "SALE").slice(0, 15);

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-ethiopic">
      {/* Back button */}
      <div>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={14} />
          <span>ወደ ሱቅ ክምችት ማጠቃለያ ተመለስ</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Form Card */}
        <div className="md:col-span-3 erp-card p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            <ShoppingBag size={16} />
            <span>የሱቅ ሽያጭ መዝገብ</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">አዲስ የሱቅ ሽያጭ አስመዝግብ</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            የተሸጠውን እቃ፣ ዋጋ እና ገዢ አስገብተው ሽያጩን ያጠናቁ
          </p>

          <div className="mt-6">
            <ShopSaleForm availableSkus={availableSkus} />
          </div>
        </div>

        {/* Recent sales sidebar */}
        <div className="md:col-span-2 space-y-4">
          <div className="erp-card p-4">
            <h3 className="font-bold text-slate-900 text-xs mb-3 flex items-center gap-2">
              <ShoppingBag size={14} className="text-emerald-600" />
              የቅርብ ጊዜ ሽያጮች
            </h3>

            {recentSales.length === 0 ? (
              <p className="text-slate-400 text-xs py-4 text-center">ምንም የቅርብ ሽያጭ የለም</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {recentSales.map((s) => (
                  <div key={s.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{s.typeId}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {s.qty} ፍሬ × {s.unitPrice ? Number(s.unitPrice).toFixed(2) : 0} ብር
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-emerald-700">
                        {s.total ? Number(s.total).toFixed(2) : 0} ብር
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {formatAsEthDate(s.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
