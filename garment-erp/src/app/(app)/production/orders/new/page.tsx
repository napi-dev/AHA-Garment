import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { createOrder } from "../../actions";
import Link from "next/link";
import { Factory, ArrowRight, Save, Plus } from "lucide-react";

export default async function NewOrderPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "bundles:edit");

  const styles = await db.garmentStyle.findMany({
    where: { isActive: true },
    orderBy: { nameAm: "asc" },
  });

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Top Navigation Link */}
      <div>
        <Link
          href="/production"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors font-ethiopic"
        >
          <ArrowRight size={14} className="rotate-180" />
          <span>ወደ ምርት ትዕዛዞች ተመለስ</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="erp-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
          <Factory size={14} />
          <span>አዲስ የምርት ትዕዛዝ ምዝገባ</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          {am.production.newOrder}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5 font-ethiopic">
          ለስፌትና ለቆረጣ የሚሆን አዲስ የምርት ትዕዛዝ መዝግብ
        </p>
      </div>

      {/* Form Card */}
      <form action={createOrder} className="erp-card p-6 md:p-8 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            የልብስ ስታይል <span className="text-rose-500">*</span>
          </label>
          <select name="styleId" required className="input-field font-ethiopic text-slate-800">
            <option value="">ስታይል ይምረጡ</option>
            {styles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameAm} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.production.targetQuantity} (የፍሬ ብዛት) <span className="text-rose-500">*</span>
          </label>
          <input
            name="quantity"
            type="number"
            min="1"
            required
            className="input-field tabular-nums"
            placeholder="ምሳሌ፦ 1000"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.production.client} (የደንበኛ / ገዢ ስም)
          </label>
          <input
            name="customer"
            className="input-field font-ethiopic"
            placeholder="ምሳሌ፦ የኢትዮጵያ ንግድ ባንክ ዩኒፎርም"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.production.deadline} (የማጠናቀቂያ ቀን)
          </label>
          <input
            name="dueDate"
            type="date"
            className="input-field"
          />
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            className="btn-primary flex-1 font-ethiopic"
          >
            <Save size={16} />
            <span>{am.save}</span>
          </button>
          <Link
            href="/production"
            className="btn-secondary px-6 font-ethiopic text-center"
          >
            {am.cancel}
          </Link>
        </div>
      </form>
    </div>
  );
}
