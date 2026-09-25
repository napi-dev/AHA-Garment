import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { createMaterial } from "../actions";

export default async function NewMaterialPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "stock:edit");

  const UNITS = ["kg", "m", "roll", "pcs", "litre", "box"];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">ጥሬ እቃ ጨምር</h1>
      <form action={createMaterial} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <Field label={am.materials.name} required>
          <input name="nameAm" required className="input-field font-ethiopic" placeholder="የጨርቅ ስም" />
        </Field>
        <Field label="English name (optional)">
          <input name="nameEn" className="input-field" placeholder="Fabric name" />
        </Field>
        <Field label={am.materials.unit} required>
          <select name="unit" required className="input-field font-ethiopic">
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </Field>
        <Field label={am.materials.minimumLevel} required>
          <input name="minimumLevel" type="number" step="0.001" min="0" defaultValue="0"
            required className="input-field tabular-nums" />
        </Field>
        <Buttons />
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
function Buttons() {
  return (
    <div className="flex gap-3 pt-2">
      <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-ethiopic font-semibold hover:bg-blue-700">{am.save}</button>
      <a href="/materials" className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-ethiopic font-semibold text-center hover:bg-gray-200">{am.cancel}</a>
    </div>
  );
}
