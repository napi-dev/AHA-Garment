import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import Link from "next/link";

export default async function MovementsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "stock:view");

  const { id } = await params;
  const material = await db.material.findUnique({ where: { id } });
  if (!material) notFound();

  const movements = await db.stockMovement.findMany({
    where: { materialId: id },
    include: { lot: true },
    orderBy: { date: "desc" },
  });

  let running = 0;
  const totals = { RECEIVE: 0, ISSUE: 0, RETURN: 0, ADJUST: 0 };
  for (const mv of [...movements].reverse()) {
    const q = Number(mv.quantity);
    if (mv.type === "RECEIVE" || mv.type === "RETURN") running += q;
    else running -= q;
    totals[mv.type as keyof typeof totals] = (totals[mv.type as keyof typeof totals] ?? 0) + q;
  }

  const typeLabel: Record<string, string> = {
    RECEIVE: am.materials.receive, ISSUE: am.materials.issue,
    RETURN: am.materials.return, ADJUST: am.materials.adjust,
  };
  const typeColor: Record<string, string> = {
    RECEIVE: "text-green-700", ISSUE: "text-red-600",
    RETURN: "text-blue-600", ADJUST: "text-purple-600",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-sm text-gray-500 mb-1">
          <Link href="/materials" className="hover:underline font-ethiopic">ጥሬ እቃ</Link> /
        </p>
        <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{material.nameAm}</h1>
        <p className="text-gray-500 text-sm font-mono">{material.sku} · {material.unit}</p>
      </div>

      {/* Current stock */}
      <div className={`rounded-2xl p-5 ${running <= Number(material.minimumLevel) ? "bg-orange-50 border border-orange-200" : "bg-green-50 border border-green-200"}`}>
        <p className="text-sm font-ethiopic text-gray-600 mb-1">{am.materials.currentStock}</p>
        <p className={`text-4xl font-bold tabular-nums ${running <= Number(material.minimumLevel) ? "text-orange-700" : "text-green-700"}`}>
          {running.toLocaleString("en-ET", { minimumFractionDigits: 3 })} {material.unit}
        </p>
        <p className="text-xs text-gray-500 mt-1 font-ethiopic">ዝቅተኛ ወሰን: {Number(material.minimumLevel).toLocaleString("en-ET", { minimumFractionDigits: 2 })} {material.unit}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(totals).map(([type, total]) => (
          <div key={type} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-ethiopic mb-1">{typeLabel[type]}</p>
            <p className={`text-xl font-bold tabular-nums ${typeColor[type]}`}>
              {total.toLocaleString("en-ET", { minimumFractionDigits: 3 })}
            </p>
          </div>
        ))}
      </div>

      {/* Movements table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm data-table">
          <thead>
            <tr>
              <th>{am.date}</th>
              <th>አይነት</th>
              <th>{am.materials.quantity}</th>
              <th>{am.materials.lot}</th>
              <th>ማጣቀሻ</th>
              <th>{am.notes}</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400 font-ethiopic">{am.noData}</td></tr>
            )}
            {movements.map((mv) => (
              <tr key={mv.id}>
                <td className="font-ethiopic">{formatAsEthDate(mv.date)}</td>
                <td><span className={`font-ethiopic text-xs font-medium ${typeColor[mv.type]}`}>{typeLabel[mv.type]}</span></td>
                <td className={`tabular-nums font-semibold ${typeColor[mv.type]}`}>
                  {mv.type === "ISSUE" || mv.type === "ADJUST" ? "−" : "+"}{Number(mv.quantity).toLocaleString("en-ET", { minimumFractionDigits: 3 })}
                </td>
                <td className="text-xs text-gray-500">{mv.lot?.lotNumber ?? "—"}</td>
                <td className="text-xs text-gray-500 font-mono">{mv.reference ?? "—"}</td>
                <td className="font-ethiopic text-xs text-gray-500">{mv.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
