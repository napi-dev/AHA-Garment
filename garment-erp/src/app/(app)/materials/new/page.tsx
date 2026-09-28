import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { createMaterial } from "../actions";
import Link from "next/link";
import { PackagePlus, ArrowRight, Save } from "lucide-react";

export default async function NewMaterialPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "stock:edit");

  const UNITS = [
    { code: "kg", label: "ኪ.ግ (kg)" },
    { code: "m", label: "ሜትር (m)" },
    { code: "roll", label: "ጥቅል/ሮል (roll)" },
    { code: "pcs", label: "ፍሬ (pcs)" },
    { code: "litre", label: "ሊትር (litre)" },
    { code: "box", label: "ካርቶን/ሳጥን (box)" },
  ];

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
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
          <PackagePlus size={14} />
          <span>አዲስ ጥሬ ዕቃ ምዝገባ</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          {am.materials.newMaterial}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5 font-ethiopic">
          አዲስ የጨርቅ፣ የክር ወይም የመለዋወጫ አይነት ወደ ፋብሪካው መጋዘን መዝግብ
        </p>
      </div>

      {/* Form Card */}
      <form action={createMaterial} className="erp-card p-6 md:p-8 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.materials.name} (በአማርኛ) <span className="text-rose-500">*</span>
          </label>
          <input
            name="nameAm"
            required
            className="input-field font-ethiopic"
            placeholder="ምሳሌ፦ ጥቁር ጥጥ ጨርቅ (Single Jersey)"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            English Name (ስም በእንግሊዝኛ - አማራጭ)
          </label>
          <input
            name="nameEn"
            className="input-field"
            placeholder="e.g. 100% Cotton Single Jersey Black"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.materials.unit} <span className="text-rose-500">*</span>
          </label>
          <select name="unit" required className="input-field font-ethiopic text-slate-800">
            {UNITS.map((u) => (
              <option key={u.code} value={u.code}>
                {u.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
            {am.materials.minimumLevel} <span className="text-rose-500">*</span>
          </label>
          <input
            name="minimumLevel"
            type="number"
            step="0.001"
            min="0"
            defaultValue="0"
            required
            className="input-field tabular-nums"
            placeholder="0.000"
          />
          <p className="text-xs text-slate-400 mt-1 font-ethiopic">
            ክምችቱ ከዚህ መጠን በታች ሲወርድ በስርዓቱ ውስጥ የማስጠንቀቂያ ማሳወቂያ ይፈጠራል።
          </p>
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
