import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import { getEffectiveDate } from "@/lib/date-override/effective-date";
import { DayCloseButton } from "./day-close-button";
import { CheckSquare, Calendar, Users, FileText, Factory, TrendingUp, AlertTriangle } from "lucide-react";

export default async function DayClosePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "counts:verify");

  const today = await getEffectiveDate();
  today.setUTCHours(0, 0, 0, 0);

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
      {/* Header */}
      <div className="erp-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 uppercase tracking-wider font-ethiopic">
          <CheckSquare size={14} />
          <span>የዕለት ሥራ ማጠቃለያ</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          {am.counts.closeDay}
        </h1>
        <p className="text-slate-500 font-ethiopic text-sm mt-0.5 flex items-center gap-2">
          <Calendar size={14} className="text-slate-400" />
          <span>{formatAsEthDate(today)} ({today.toLocaleDateString("en-ET")})</span>
        </p>
      </div>

      {/* Summary card */}
      <div className="erp-card p-6 space-y-5">
        <h2 className="font-bold text-slate-800 font-ethiopic text-base flex items-center gap-2">
          <span>📊</span>
          <span>የዛሬ የፋብሪካው ጠቅላላ የምርት ማጠቃለያ</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatBox
            label="የምርት ሰሌዳዎች"
            value={sheetCount}
            icon={<FileText size={16} className="text-blue-600" />}
          />
          <StatBox
            label="የተመዘገቡ ሠራተኞች"
            value={lineStats._count._all}
            icon={<Users size={16} className="text-indigo-600" />}
          />
          <StatBox
            label="ጠቅላላ የተመረተ"
            value={lineStats._sum.totalProduced ?? 0}
            color="text-blue-700"
            icon={<Factory size={16} className="text-blue-600" />}
          />
          <StatBox
            label="+የትርፍ ምርት ፍሬ"
            value={lineStats._sum.plusPieces ?? 0}
            color="text-emerald-700"
            icon={<TrendingUp size={16} className="text-emerald-600" />}
          />
          <StatBox
            label="−ያልተሟላ ፍሬ"
            value={lineStats._sum.minusPieces ?? 0}
            color="text-rose-600"
          />
          <StatBox
            label="ማረጋገጫ የሚጠብቁ"
            value={pendingLines}
            color={pendingLines > 0 ? "text-amber-600" : "text-slate-400"}
            icon={pendingLines > 0 ? <AlertTriangle size={16} className="text-amber-600" /> : undefined}
          />
        </div>

        {pendingLines > 0 && (
          <div className="alert-warning font-ethiopic text-xs flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-700 flex-shrink-0" />
            <span>{pendingLines} ሠራተኞች ያስመዘገቧቸው ቁጥሮች ገና አልተረጋገጡም። ቀን ከመዝጋቱ በፊት ማረጋገጥ ይመከራል።</span>
          </div>
        )}

        {verifiedLines === 0 && lineStats._count._all > 0 && (
          <div className="alert-info font-ethiopic text-xs flex items-center gap-2">
            <span>ℹ️</span>
            <span>እስካሁን የተረጋገጠ ቁጥር የለም። የቁጥጥር ሂደቱ ከተጠናቀቀ በኋላ ቀኑን መዝጋት ይችላሉ።</span>
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

function StatBox({
  label,
  value,
  color = "text-slate-800",
  icon,
}: {
  label: string;
  value: number;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3.5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-slate-500 font-ethiopic truncate">{label}</p>
        {icon}
      </div>
      <p className={`text-xl font-bold tabular-nums ${color}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
