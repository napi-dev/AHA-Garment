import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import { DayCloseButton } from "./day-close-button";

export default async function DayClosePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "counts:verify");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayClose = await db.dayClose.findUnique({ where: { date: today } });

  // Summary for today
  const sheetCount = await db.hourlyCountSheet.count({ where: { date: today } });
  const lineStats = await db.hourlyCountLine.aggregate({
    where: { sheet: { date: today } },
    _count: { _all: true },
    _sum: { totalProduced: true, plusPieces: true, minusPieces: true },
  });
  const pendingLines = await db.hourlyCountLine.count({
    where: { sheet: { date: today }, status: "SUBMITTED" },
  });
  const verifiedLines = await db.hourlyCountLine.count({
    where: { sheet: { date: today }, status: "VERIFIED" },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">{am.counts.closeDay}</h1>
      <p className="text-gray-500 font-ethiopic text-sm">
        {formatAsEthDate(today)} — {today.toLocaleDateString("en-ET")}
      </p>

      {/* Summary card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 font-ethiopic">የዛሬ ማጠቃለያ</h2>

        <div className="grid grid-cols-2 gap-4">
          <StatBox label="የሰሌዳ ብዛት" value={sheetCount} />
          <StatBox label="የሠራተኛ ቁጥር" value={lineStats._count._all} />
          <StatBox label="ጠቅላላ ያደረሱ" value={lineStats._sum.totalProduced ?? 0} color="text-blue-700" />
          <StatBox label="+ፍሬ" value={lineStats._sum.plusPieces ?? 0} color="text-green-700" />
          <StatBox label="−ፍሬ" value={lineStats._sum.minusPieces ?? 0} color="text-red-600" />
          <StatBox label="ያልተረጋገጠ" value={pendingLines} color={pendingLines > 0 ? "text-amber-600" : "text-gray-400"} />
        </div>

        {pendingLines > 0 && (
          <div className="alert-warning font-ethiopic text-sm">
            {pendingLines} ቁጥሮች ገና አልተረጋገጡም። ቀን ከመዝጋቱ በፊት ያረጋግጡ።
          </div>
        )}

        {verifiedLines === 0 && lineStats._count._all > 0 && (
          <div className="alert-info font-ethiopic text-sm">
            ምንም ቁጥር አልተረጋገጠም። ዋና ሥራ አስኪያጅ ወይም አስተዳዳሪ ካስፈቀዱ ብቻ ይቀጥሉ።
          </div>
        )}
      </div>

      {/* Close action */}
      <DayCloseButton
        date={today.toISOString()}
        alreadyClosed={!!dayClose}
        closedAt={dayClose?.closedAt?.toISOString() ?? null}
      />
    </div>
  );
}

function StatBox({ label, value, color = "text-gray-800" }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-xs text-gray-500 font-ethiopic mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
