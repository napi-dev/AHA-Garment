import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import { createLot } from "../../actions";

export default async function LotsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "stock:view");
  const { id } = await params;
  const supplier = await db.supplier.findUnique({
    where: { id },
    include: { lots: { orderBy: { receivedAt: "desc" } } },
  });
  if (!supplier) notFound();

  const action = createLot.bind(null, id);
  const today  = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{supplier.nameAm} — ሎቶች</h1>

      <form action={action} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-gray-500 mb-1 font-ethiopic">ሎት ቁጥር *</label>
          <input name="lotNumber" required placeholder="LOT-001" className="input-field font-mono" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-ethiopic">የደረሰበት ቀን</label>
          <input name="receivedAt" type="date" defaultValue={today} className="input-field" />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-gray-500 mb-1 font-ethiopic">ማስታወሻ</label>
          <input name="notes" className="input-field font-ethiopic" />
        </div>
        <button type="submit" className="px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-ethiopic hover:bg-blue-700">ጨምር</button>
      </form>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm data-table">
          <thead><tr><th>ሎት ቁጥር</th><th>ደርሷል</th><th>ማስታወሻ</th></tr></thead>
          <tbody>
            {supplier.lots.length === 0 && (
              <tr><td colSpan={3} className="text-center py-10 text-gray-400 font-ethiopic">ምንም ሎት የለም</td></tr>
            )}
            {supplier.lots.map((l) => (
              <tr key={l.id}>
                <td className="font-mono font-medium">{l.lotNumber}</td>
                <td className="font-ethiopic">{formatAsEthDate(l.receivedAt)}</td>
                <td className="font-ethiopic text-gray-500">{l.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
