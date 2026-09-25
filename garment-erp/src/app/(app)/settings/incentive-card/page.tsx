import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import { updateIncentiveCard } from "./actions";
import Decimal from "decimal.js";

export default async function IncentiveCardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "incentive_card:edit");

  const today = new Date().toISOString().split("T")[0];

  // All departments with their current active card
  const departments = await db.department.findMany({
    where: { isActive: true },
    include: {
      incentiveCards: {
        where: { effectiveTo: null },
        orderBy: { effectiveFrom: "desc" },
        take: 1,
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500 mb-1">
          <a href="/settings" className="hover:underline font-ethiopic">ቅንብሮች</a> /
        </p>
        <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{am.incentive.title} ካርድ</h1>
        <p className="text-gray-500 text-sm mt-0.5 font-ethiopic">
          ዋጋዎችን ሲቀይሩ አዲስ ኢፊከቲቭ ቀን ያስፈልጋል። ቀደምት ክፍያዎች አይቀየሩም።
        </p>
      </div>

      {/* Bulk effective date — applies to all rows saved */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
        <span className="text-amber-700 text-lg">📅</span>
        <p className="text-sm text-amber-700 font-ethiopic">
          ከዚህ ታች ያሉ ለውጦች ሁሉም ከተቀመጡ ጀምሮ ወዲያው ይሠራሉ። ልዩ ቀን ካስፈለገ ለእያንዳንዱ ረድፍ ያስገቡ።
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-3 text-right text-gray-500 font-medium font-ethiopic">ክፍል</th>
              <th className="p-3 text-center text-gray-500 font-medium font-ethiopic">ደረጃ</th>
              <th className="p-3 text-center text-gray-500 font-medium w-28">{am.incentive.targetPerHour}</th>
              <th className="p-3 text-center text-gray-500 font-medium w-28">{am.incentive.ratePerPiece}</th>
              <th className="p-3 text-center text-gray-500 font-medium w-36">ኢፊ. ቀን</th>
              <th className="p-3 text-center text-gray-500 font-medium w-20">{am.actions}</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept) => {
              const card = dept.incentiveCards[0];
              const action = updateIncentiveCard.bind(null, dept.id, session.user.id);
              return (
                <tr key={dept.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-ethiopic text-gray-800 font-medium">{dept.nameAm}</td>
                  <td className="p-3 text-center">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-ethiopic">
                      {am.stages[dept.stage as keyof typeof am.stages] ?? dept.stage}
                    </span>
                  </td>
                  <td className="p-2">
                    <form action={action} className="flex gap-2 items-center justify-center">
                      <input name="targetPerHour" type="number" min="0" max="9999"
                        defaultValue={card?.targetPerHour ?? 0}
                        className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      <input name="ratePerPiece" type="number" min="0" step="0.0001" max="99"
                        defaultValue={card ? new Decimal(card.ratePerPiece.toString()).toFixed(4) : "0.0000"}
                        className="w-24 px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      <input name="effectiveFrom" type="date" defaultValue={today}
                        className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      <button type="submit"
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-ethiopic hover:bg-blue-700 transition-colors whitespace-nowrap">
                        {am.save}
                      </button>
                    </form>
                  </td>
                  <td className="p-3 text-center">
                    {card
                      ? <span className="text-xs text-gray-400 font-ethiopic">{formatAsEthDate(card.effectiveFrom)}</span>
                      : <span className="text-xs text-gray-300 font-ethiopic">ካርድ የለም</span>}
                  </td>
                  <td className="p-3"></td>
                  <td className="p-3"></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Card history */}
      <CardHistory />
    </div>
  );
}

async function CardHistory() {
  const history = await db.incentiveCard.findMany({
    where: { effectiveTo: { not: null } },
    include: { department: { select: { nameAm: true } } },
    orderBy: { effectiveFrom: "desc" },
    take: 20,
  });

  if (history.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-700 font-ethiopic">የቀደምት ካርዶች ታሪክ</h2>
      </div>
      <table className="w-full text-sm data-table">
        <thead>
          <tr>
            <th>ክፍል</th>
            <th>{am.incentive.targetPerHour}</th>
            <th>{am.incentive.ratePerPiece}</th>
            <th>ከ</th>
            <th>እስከ</th>
          </tr>
        </thead>
        <tbody>
          {history.map((c) => (
            <tr key={c.id} className="opacity-70">
              <td className="font-ethiopic text-gray-600">{c.department.nameAm}</td>
              <td className="tabular-nums text-center">{c.targetPerHour}</td>
              <td className="tabular-nums text-center">{new Decimal(c.ratePerPiece.toString()).toFixed(4)}</td>
              <td className="font-ethiopic text-xs text-gray-500">{formatAsEthDate(c.effectiveFrom)}</td>
              <td className="font-ethiopic text-xs text-gray-500">{c.effectiveTo ? formatAsEthDate(c.effectiveTo) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
