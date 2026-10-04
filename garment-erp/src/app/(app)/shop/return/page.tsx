import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { recordShopReturn } from "../actions";
import Link from "next/link";
import { ArrowLeftRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";

export const dynamic = "force-dynamic";

export default async function ShopReturnPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  requirePermission(session.user.role, "/shop/return");

  // Fetch recent returns
  const recentReturns = await db.shopMovement.findMany({
    where: { type: "RETURN", voidedAt: null },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

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
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 uppercase tracking-wider">
            <ArrowLeftRight size={16} />
            <span>ወደ ፋብሪካ ተመላሽ ቅጽ</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            እቃ ወደ ፋብሪካ መልስ
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            ጥራት ጉድለት ያለባቸው ወይም ያልተሸጡ እቃዎችን ወደ ፋብሪካው ለመመለስ ይመዝግቡ
          </p>

          <form action={recordShopReturn} className="mt-6 space-y-4 text-xs">
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
              <label className="font-semibold text-slate-700 block mb-1">
                የእቃ አይነት (ስታይል) *
              </label>
              <input
                type="text"
                name="typeId"
                required
                placeholder="ለምሳሌ፦ ነጭ ቲ-ሸርት"
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
                  placeholder="ለምሳሌ፦ ነጭ"
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
                <label className="font-semibold text-slate-700 block mb-1">የሚመለስ ብዛት *</label>
                <input
                  type="number"
                  name="qty"
                  min="1"
                  required
                  placeholder="ለምሳሌ፦ 10"
                  className="input-field font-mono font-bold text-rose-700"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">የተመለሰበት ምክንያት *</label>
              <select name="reason" required className="input-field">
                <option value="ጥራት ችግር (Rework)">ጥራት ችግር — ለጥገና (Quality Defect / Rework)</option>
                <option value="ያልተሸጠ / ትርፍ">ያልተሸጠ / ትርፍ እቃ (Unsold / Excess)</option>
                <option value="የተሳሳተ መጠን ወይም ቀለም">የተሳሳተ መጠን ወይም ቀለም (Wrong Spec)</option>
                <option value="ሌላ ምክንያት">ሌላ ምክንያት (Other)</option>
              </select>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="btn-primary py-2.5 px-6 text-xs bg-rose-600 hover:bg-rose-700 flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 size={16} />
                <span>ተመላሹን አስመዝግብ</span>
              </button>
            </div>
          </form>
        </div>

        {/* Recent returns sidebar */}
        <div className="md:col-span-2 space-y-4">
          <div className="erp-card p-4">
            <h3 className="font-bold text-slate-900 text-xs mb-3 flex items-center gap-2">
              <ArrowLeftRight size={14} className="text-rose-600" />
              የቅርብ ጊዜ ተመላሾች
            </h3>

            {recentReturns.length === 0 ? (
              <p className="text-slate-400 text-xs py-4 text-center">ምንም የተመዘገበ ተመላሽ የለም</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {recentReturns.map((r) => (
                  <div key={r.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{r.typeId}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {r.color} · {r.size} · <span className="text-rose-600">{r.voidReason}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-rose-600">-{r.qty} ፍሬ</p>
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
