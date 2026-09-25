import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import Link from "next/link";
import { Scissors, Plus } from "lucide-react";

export default async function CuttingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "cuts:view");

  const jobs = await db.cutJob.findMany({
    include: { order: { include: { style: true } }, bundles: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const totalWaste = jobs.filter((j) => Number(j.wastagePct) > 5).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-ethiopic flex items-center gap-2">
            <Scissors size={22} /> ቆረጣ
          </h1>
          {totalWaste > 0 && (
            <p className="text-sm text-red-600 font-ethiopic mt-0.5">{totalWaste} ቡድ ሥራ ከ 5% ብክነት በላይ ⚠️</p>
          )}
        </div>
        <Link href="/cutting/new"
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors font-ethiopic">
          <Plus size={16} /> ቆርጦ ጀምር
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm data-table">
          <thead>
            <tr>
              <th>ቀን</th>
              <th>ትዕዛዝ</th>
              <th>ስታይል</th>
              <th>ጥቅም ላይ (ኪ.ግ)</th>
              <th>የተቆረጠ</th>
              <th>ብክነት %</th>
              <th>ባንድሎች</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400 font-ethiopic">ምንም ቆርጦ የለም</td></tr>
            )}
            {jobs.map((j) => {
              const waste = Number(j.wastagePct);
              return (
                <tr key={j.id} className={waste > 5 ? "bg-red-50/50" : ""}>
                  <td className="font-ethiopic text-sm">{formatAsEthDate(j.date)}</td>
                  <td className="font-mono text-xs text-gray-700">{j.order.orderNumber}</td>
                  <td className="font-ethiopic text-gray-800">{j.order.style.nameAm}</td>
                  <td className="tabular-nums text-right">{Number(j.weightUsed).toFixed(3)}</td>
                  <td className="tabular-nums text-center">{j.piecesCut.toLocaleString()}</td>
                  <td className={`tabular-nums font-semibold text-center ${waste > 5 ? "text-red-600" : "text-green-700"}`}>
                    {waste.toFixed(1)}%
                    {waste > 5 && " ⚠️"}
                  </td>
                  <td className="text-center tabular-nums">{j.bundles.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
