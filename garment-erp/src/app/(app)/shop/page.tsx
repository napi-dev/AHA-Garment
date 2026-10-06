import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import Link from "next/link";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import { 
  Store, Package, ShoppingBag, ArrowLeftRight, 
  TrendingDown, Plus, AlertCircle, CheckCircle2 
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  requirePermission(session.user.role, "/shop");

  const movements = await db.shopMovement.findMany({
    include: {
      order: { select: { orderNo: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Aggregate balance by SKU: typeId + color + size
  type SkuRow = {
    typeId: string;
    color: string;
    size: string;
    received: number;
    sold: number;
    returned: number;
    balance: number;
  };

  const skuMap = new Map<string, SkuRow>();

  for (const m of movements) {
    if (m.voidedAt) continue;
    const key = `${m.typeId}__${m.color}__${m.size}`;
    let row = skuMap.get(key);
    if (!row) {
      row = {
        typeId: m.typeId,
        color: m.color,
        size: m.size,
        received: 0,
        sold: 0,
        returned: 0,
        balance: 0,
      };
      skuMap.set(key, row);
    }

    if (m.type === "RECEIVE") row.received += m.qty;
    else if (m.type === "SALE") row.sold += m.qty;
    else if (m.type === "RETURN") row.returned += m.qty;
  }

  const stockRows = Array.from(skuMap.values()).map((r) => ({
    ...r,
    balance: r.received - r.sold - r.returned,
  }));

  const totalStock = stockRows.reduce((sum, r) => sum + r.balance, 0);
  const totalSold = stockRows.reduce((sum, r) => sum + r.sold, 0);
  const totalReceived = stockRows.reduce((sum, r) => sum + r.received, 0);
  const soldOutCount = stockRows.filter((r) => r.balance <= 0).length;

  const canSeeMoney = session.user.role === "ADMIN" || session.user.role === "ORDER_PLACER";
  const colSpanCount = canSeeMoney ? 8 : 6;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="erp-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 font-ethiopic">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
            <Store size={16} />
            <span>የሱቅ ክምችትና ሽያጭ ቁጥጥር</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">የሱቅ ቀሪ (Stock Balance)</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            የሱቅ እቃዎች ክምችት፣ የተሸጡ ምርቶች እና ወደ ፋብሪካ የተመለሱ እቃዎች ማጠቃለያ
          </p>
        </div>

        {session.user.role === "ADMIN" || session.user.role === "ORDER_PLACER" ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/shop/receive"
              className="btn-primary py-2 px-3 text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Package size={15} />
              <span>እቃ ተቀበል</span>
            </Link>
            <Link
              href="/shop/sale"
              className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 shadow-sm"
            >
              <ShoppingBag size={15} />
              <span>ሽያጭ መዝግብ</span>
            </Link>
            <Link
              href="/shop/return"
              className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 text-rose-700 border-rose-200 hover:bg-rose-50 shadow-sm"
            >
              <ArrowLeftRight size={15} />
              <span>ተመላሽ ላክ</span>
            </Link>
          </div>
        ) : (
          <div className="flex items-center">
            <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 font-semibold">
              የቀሪ እይታ ብቻ (View Only)
            </span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 font-ethiopic">
        <div className="erp-card p-4 border-l-4 border-l-blue-600">
          <p className="text-xs text-slate-500 font-medium">በሱቅ ያለ ጠቅላላ ቀሪ</p>
          <p className="text-2xl font-mono font-bold text-blue-700 mt-1">
            {totalStock.toLocaleString()} <span className="text-xs font-normal">ፍሬ</span>
          </p>
        </div>

        <div className="erp-card p-4 border-l-4 border-l-emerald-600">
          <p className="text-xs text-slate-500 font-medium">የተሸጠ ጠቅላላ ምርት</p>
          <p className="text-2xl font-mono font-bold text-emerald-700 mt-1">
            {totalSold.toLocaleString()} <span className="text-xs font-normal">ፍሬ</span>
          </p>
        </div>

        <div className="erp-card p-4 border-l-4 border-l-indigo-600">
          <p className="text-xs text-slate-500 font-medium">የገባ ጠቅላላ ምርት</p>
          <p className="text-2xl font-mono font-bold text-slate-900 mt-1">
            {totalReceived.toLocaleString()} <span className="text-xs font-normal">ፍሬ</span>
          </p>
        </div>

        <div className="erp-card p-4 border-l-4 border-l-rose-500">
          <p className="text-xs text-slate-500 font-medium">ያለቁ እቃዎች (0 ቀሪ)</p>
          <p className="text-2xl font-mono font-bold text-rose-600 mt-1">{soldOutCount}</p>
        </div>
      </div>

      {/* Main Stock Balance Table */}
      <div className="erp-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 font-ethiopic flex items-center gap-2">
            <Store size={16} className="text-blue-600" />
            የሱቅ ቀሪ ሰንጠረዥ (ቀሪ = የገባ − የወጣ − ተመላሽ)
          </h2>
          <span className="text-xs text-slate-400 font-ethiopic">
            {stockRows.length} የተለያዩ አይነቶች
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-ethiopic text-right">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold">
                <th className="py-3 px-4 text-left">የእቃ አይነት (ስታይል)</th>
                <th className="py-3 px-4 text-left">ቀለም</th>
                <th className="py-3 px-4 text-center">ሳይዝ</th>
                <th className="py-3 px-4">የገባ</th>
                <th className="py-3 px-4">የወጣ (ሽያጭ)</th>
                <th className="py-3 px-4">ተመላሽ</th>
                <th className="py-3 px-4 font-bold text-slate-900">ቀሪ (Balance)</th>
                <th className="py-3 px-4 text-center">ሁኔታ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stockRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    ምንም የሱቅ እቃ አልተመዘገበም
                  </td>
                </tr>
              ) : (
                stockRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 text-left font-semibold text-slate-900">{r.typeId}</td>
                    <td className="py-3 px-4 text-left text-slate-700">{r.color}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold">{r.size}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{r.received}</td>
                    <td className="py-3 px-4 font-mono text-emerald-700 font-semibold">{r.sold}</td>
                    <td className="py-3 px-4 font-mono text-rose-600">{r.returned}</td>
                    <td className="py-3 px-4 font-mono font-bold text-sm text-blue-700">
                      {r.balance}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {r.balance <= 0 ? (
                        <span className="badge-void text-[10px]">አልቋል</span>
                      ) : r.balance < 10 ? (
                        <span className="badge-draft text-[10px]">ዝቅተኛ</span>
                      ) : (
                        <span className="badge-confirmed text-[10px]">አለ</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Movements Log */}
      <div className="erp-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 font-ethiopic flex items-center gap-2">
            <ArrowLeftRight size={16} className="text-slate-600" />
            የቅርብ ጊዜ እንቅስቃሴዎች (መቀበያ / ሽያጭ / ተመላሽ)
          </h2>
          <span className="text-xs text-slate-400 font-ethiopic">
            ያለፉት {Math.min(movements.length, 30)} እንቅስቃሴዎች
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-ethiopic text-right">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold">
                <th className="py-2.5 px-4 text-left">ቀን</th>
                <th className="py-2.5 px-4 text-left">ዓይነት</th>
                <th className="py-2.5 px-4 text-left">ስታይል / ቀለም / ሳይዝ</th>
                <th className="py-2.5 px-4">ብዛት</th>
                {canSeeMoney && (
                  <>
                    <th className="py-2.5 px-4">የፍሬ ዋጋ</th>
                    <th className="py-2.5 px-4">ጠቅላላ ገቢ</th>
                  </>
                )}
                <th className="py-2.5 px-4 text-left">ገዥ / ማስታወሻ</th>
                <th className="py-2.5 px-4 text-center">ሁኔታ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.slice(0, 30).map((m) => {
                const isVoid = !!m.voidedAt;
                return (
                  <tr key={m.id} className={isVoid ? "opacity-40 line-through bg-slate-50/40" : ""}>
                    <td className="py-2.5 px-4 text-left font-mono text-slate-600">
                      {formatAsEthDate(m.date)}
                    </td>
                    <td className="py-2.5 px-4 text-left">
                      {m.type === "RECEIVE" && (
                        <span className="inline-flex items-center gap-1 text-blue-700 font-semibold">
                          <Package size={12} /> መቀበያ
                        </span>
                      )}
                      {m.type === "SALE" && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <ShoppingBag size={12} /> ሽያጭ
                        </span>
                      )}
                      {m.type === "RETURN" && (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                          <ArrowLeftRight size={12} /> ተመላሽ
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-left font-medium text-slate-800">
                      {m.typeId} · {m.color} · <span className="font-mono">{m.size}</span>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{m.qty}</td>
                    {canSeeMoney && (
                      <>
                        <td className="py-2.5 px-4 font-mono">
                          {m.unitPrice ? `${Number(m.unitPrice).toFixed(2)} ብር` : "—"}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-emerald-800">
                          {m.total ? `${Number(m.total).toFixed(2)} ብር` : "—"}
                        </td>
                      </>
                    )}
                    <td className="py-2.5 px-4 text-left text-slate-600">
                      {m.buyerName || m.voidReason || "—"}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {isVoid ? (
                        <span className="badge-void text-[10px]">የተሰረዘ</span>
                      ) : (
                        <span className="badge-confirmed text-[10px]">ተፈጽሟል</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
