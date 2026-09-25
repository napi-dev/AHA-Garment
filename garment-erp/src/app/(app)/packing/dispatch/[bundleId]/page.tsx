import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { dispatchBundle } from "../../actions";

export default async function DispatchPage({ params }: { params: Promise<{ bundleId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "finished_goods:edit");

  const { bundleId } = await params;
  const bundle = await db.bundle.findUnique({
    where: { id: bundleId },
    include: { cutJob: { include: { order: { include: { style: true } } } } },
  });
  if (!bundle) notFound();

  const today = new Date().toISOString().split("T")[0];
  const action = dispatchBundle.bind(null, bundleId, session.user.id);

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <p className="text-sm text-gray-500 font-ethiopic mb-1">
          <a href="/packing" className="hover:underline">ማሸግ</a> /
        </p>
        <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">ላክ — {bundle.bundleCode}</h1>
        <p className="text-gray-600 font-ethiopic mt-0.5">
          {bundle.cutJob.order.style.nameAm} · {bundle.quantity} ፍሬ
        </p>
      </div>

      <form action={action} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">ደምበኛ *</label>
          <input name="customer" required defaultValue={bundle.cutJob.order.customer ?? ""}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-ethiopic"
            placeholder="ደምበኛ ስም" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">የተላከ ፍሬ *</label>
          <input name="quantity" type="number" min="1" max={bundle.quantity}
            defaultValue={bundle.quantity} required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">ቀን</label>
          <input name="dispatchedAt" type="date" defaultValue={today}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">{am.notes}</label>
          <textarea name="notes" rows={2}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-ethiopic resize-none text-sm" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit"
            className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-ethiopic font-semibold hover:bg-teal-700 transition-colors">
            🚚 ላክ
          </button>
          <a href="/packing"
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-ethiopic font-semibold text-center hover:bg-gray-200 transition-colors">
            {am.cancel}
          </a>
        </div>
      </form>
    </div>
  );
}
