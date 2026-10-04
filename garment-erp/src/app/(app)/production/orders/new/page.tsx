import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { todayISOStringEAT } from "@/lib/ethiopian-calendar";
import { createOrder } from "../../actions";
import Link from "next/link";
import { Factory, ArrowRight, Save } from "lucide-react";

const GARMENT_TYPES = ["ቲ-ሸርት", "ትራክ ሱሪ", "ፖሎ ሸሚዝ", "ጃኬት", "ሆዲ", "ሌላ"];
const COMMON_COLORS = ["ነጭ", "ጥቁር", "ግራጫ", "ሰማያዊ", "ቀይ", "አረንጓዴ", "ቢጫ"];
const SIZES = ["S", "M", "L", "XL", "XXL"] as const;

export default async function NewOrderPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "/production/orders");

  const today = todayISOStringEAT();

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
          ለፋብሪካው አዲስ የልብስ ምርት ትዕዛዝ መስመር ይመዝግቡ
        </p>
      </div>

      {/* Form Card */}
      <form action={createOrder} className="erp-card p-6 md:p-8 space-y-5">
        {/* Date (Today) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            የተመዘገበበት ቀን
          </label>
          <input
            type="text"
            readOnly
            value={today}
            className="input-field bg-slate-50 font-mono text-slate-600 cursor-not-allowed"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            የልብስ ዓይነት (Type) <span className="text-rose-500">*</span>
          </label>
          <select name="typeId" required className="input-field font-ethiopic text-slate-800">
            {GARMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Color */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            ቀለም (Color) <span className="text-rose-500">*</span>
          </label>
          <input
            name="color"
            list="colors"
            required
            defaultValue="ነጭ"
            placeholder="ነጭ፣ ጥቁር..."
            className="input-field font-ethiopic text-slate-800"
          />
          <datalist id="colors">
            {COMMON_COLORS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        {/* Size */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            ሳይዝ (Size) <span className="text-rose-500">*</span>
          </label>
          <select name="size" required defaultValue="L" className="input-field font-mono font-bold text-slate-800">
            {SIZES.map((sz) => (
              <option key={sz} value={sz}>
                {sz}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            የሚመረተው ብዛት (ቁጥር) <span className="text-rose-500">*</span>
          </label>
          <input
            name="qty"
            type="number"
            min="1"
            required
            placeholder="ምሳሌ፦ 400"
            className="input-field font-bold tabular-nums text-slate-800"
          />
        </div>

        {/* Deadline Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
              የማጠናቀቂያ ቀን <span className="text-rose-500">*</span>
            </label>
            <input
              name="deadlineDate"
              type="date"
              required
              className="input-field text-slate-800 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
              የማጠናቀቂያ ሰዓት
            </label>
            <input
              name="deadlineTime"
              type="time"
              defaultValue="17:00"
              required
              className="input-field text-slate-800 font-mono"
            />
          </div>
        </div>

        <div className="pt-2">
          <button type="submit" className="btn-primary w-full py-3 flex items-center justify-center gap-2 font-ethiopic">
            <Save size={16} />
            <span>ትዕዛዝ መዝግብ</span>
          </button>
        </div>
      </form>
    </div>
  );
}
