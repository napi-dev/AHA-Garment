import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { recordShopReceive } from "../actions";
import Link from "next/link";
import { Package, ArrowLeft, CheckCircle2 } from "lucide-react";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";

export const dynamic = "force-dynamic";

export default async function ShopReceivePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  requirePermission(session.user.role, "/shop/receive");

  const [activeOrders, recentReceives] = await Promise.all([
    db.prodOrder.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, orderNo: true },
      orderBy: { createdAt: "desc" },
    }),
    db.shopMovement.findMany({
      where: { type: "RECEIVE", voidedAt: null },
      include: { order: { select: { orderNo: true } } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  const todayStr = new Date().toISOString().split("T")[0];

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
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
            <Package size={16} />
            <span>የሱቅ እቃ መረከቢያ ቅጽ</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            አዲስ እቃ ወደ ሱቅ አስገባ
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            ከፋብሪካ ወይም ከሌላ ምንጭ የተላከውን እቃ ተረክበው እዚህ ይመዝግቡ
          </p>

          <form action={recordShopReceive} className="mt-6 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">ቀን *</label>
                <input
                  type="date"
                  name="date"
                  defaultValue={todayStr}
                  required
                  className="input-field font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">የእቃው ምንጭ *</label>
                <select name="source" required className="input-field">
                  <option value="FACTORY">ፋብሪካ (Factory)</option>
                  <option value="RETURN">ትዕዛዝ ተመላሽ (Return)</option>
                  <option value="OTHER">ሌላ (Other)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                የምርት ትዕዛዝ (ከፋብሪካ ከሆነ)
              </label>
              <select name="orderId" className="input-field font-mono">
                <option value="">ትዕዛዝ የለውም / አጠቃላይ</option>
                {activeOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                የእቃ አይነት (ስታይል) *
              </label>
              <input
                type="text"
                name="typeId"
                required
                placeholder="ለምሳሌ፦ ነጭ ቲ-ሸርት ወይም ትራክ ሱሪ"
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">ቀለም *</label>
                <input
                  type="text"
                  name="color"
                  required
                  placeholder="ለምሳሌ፦ ጥቁር"
                  className="input-field"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">ሳይዝ *</label>
                <select name="size" required defaultValue="L" className="input-field font-mono">
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="XXL">XXL</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">የገባ ብዛት *</label>
                <input
                  type="number"
                  name="qty"
                  min="1"
                  required
                  placeholder="ለምሳሌ፦ 100"
                  className="input-field font-mono font-bold"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button type="submit" className="btn-primary py-2.5 px-6 text-xs flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 size={16} />
                <span>እቃውን ተረከብኩ መዝግብ</span>
              </button>
            </div>
          </form>
        </div>

        {/* Recent receives sidebar */}
        <div className="md:col-span-2 space-y-4">
          <div className="erp-card p-4">
            <h3 className="font-bold text-slate-900 text-xs mb-3 flex items-center gap-2">
              <Package size={14} className="text-blue-600" />
              የቅርብ ጊዜ መቀበያዎች
            </h3>

            {recentReceives.length === 0 ? (
              <p className="text-slate-400 text-xs py-4 text-center">ምንም የቅርብ መረጃ የለም</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {recentReceives.map((r) => (
                  <div key={r.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{r.typeId}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {r.color} · {r.size} {r.order ? `· ${r.order.orderNo}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-blue-700">+{r.qty} ፍሬ</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {formatAsEthDate(r.date)}
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
