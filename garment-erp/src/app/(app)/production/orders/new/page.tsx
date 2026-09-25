import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { createOrder } from "../../actions";

export default async function NewOrderPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "bundles:edit");

  const styles = await db.garmentStyle.findMany({ where: { isActive: true }, orderBy: { nameAm: "asc" } });

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">ትዕዛዝ ጨምር</h1>
      <form action={createOrder} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <F label="ስታይል *">
          <select name="styleId" required className="input-field font-ethiopic">
            <option value="">ምረጥ</option>
            {styles.map((s) => <option key={s.id} value={s.id}>{s.nameAm} ({s.code})</option>)}
          </select>
        </F>
        <F label="መጠን (ፍሬዎች) *">
          <input name="quantity" type="number" min="1" required className="input-field tabular-nums" placeholder="1000" />
        </F>
        <F label="ደምበኛ">
          <input name="customer" className="input-field font-ethiopic" placeholder="ደምበኛ ስም" />
        </F>
        <F label="ማብቂያ ቀን">
          <input name="dueDate" type="date" className="input-field" />
        </F>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-ethiopic font-semibold hover:bg-blue-700">አስቀምጥ</button>
          <a href="/production" className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-ethiopic font-semibold text-center hover:bg-gray-200">ሰርዝ</a>
        </div>
      </form>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">{label}</label>
      {children}
    </div>
  );
}
