import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import { getEffectiveDate } from "@/lib/date-override/effective-date";
import { DayCloseButton } from "./day-close-button";
import { GenerateReportButton } from "./generate-report-button";
import { PurgeAuditButton } from "./purge-audit-button";
import {
  CheckSquare, Calendar, Users, FileText,
  Factory, TrendingUp, AlertTriangle, History,
} from "lucide-react";

export default async function DayClosePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "counts:verify");

  // Effective today (respects admin date override)
  const today = await getEffectiveDate();
  today.setUTCHours(0, 0, 0, 0);

  const todayClose = await db.dayClose.findUnique({ where: { date: today } });

  // ── Find the active working date ──────────────────────────────────────────
  // If today is already closed, check if yesterday was not closed but had entries
  // (the manager forgot to close it). Show that day instead so they can still close it.
  let workingDate = today;
  let isYesterday = false;

  if (todayClose) {
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const yesterdayClose  = await db.dayClose.findUnique({ where: { date: yesterday } });
    const yesterdaySheets = await db.hourlyCountSheet.count({ where: { date: yesterday } });

    if (!yesterdayClose && yesterdaySheets > 0) {
      workingDate = yesterday;
      isYesterday = true;
    }
  }

  const dayClose = workingDate === today ? todayClose : null;

  // Summary for working date — all in parallel
  const [sheetCount, lineStats, pendingLines, verifiedLines] = await Promise.all([
    db.hourlyCountSheet.count({ where: { date: workingDate } }),
    db.hourlyCountLine.aggregate({
      where: { sheet: { date: workingDate } },
      _count: { _all: true },
      _sum: { totalProduced: true, plusPieces: true, minusPieces: true },
    }),
    db.hourlyCountLine.count({
      where: { sheet: { date: workingDate }, status: "SUBMITTED" },
    }),
    db.hourlyCountLine.count({
      where: { sheet: { date: workingDate }, status: "VERIFIED" },
    }),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Yesterday warning banner */}
      {isYesterday && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-800">
          <History size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs font-ethiopic leading-relaxed">
            <p className="font-bold">ትናንት ቀን ያልተዘጋ ምዝገባ አለ!</p>
            <p className="mt-0.5 text-amber-700">
              የዛሬ ({formatAsEthDate(today)}) ቀን ቀድሞ ተዘግቷል።
              ትናንት ({formatAsEthDate(workingDate)}) ግን ቁጥሮች ተስቀምጠዋል ነገር ግን ቀኑ አልተዘጋም።
              ከዚህ ታች ያለው ማጠቃለያ ለትናንት ነው።
            </p>
          </div>
        </div>
      )}

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
          <span>{formatAsEthDate(workingDate)}</span>
          {isYesterday && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
              ትናንት
            </span>
          )}
        </p>
      </div>

      {/* Summary card */}
      <div className="erp-card p-6 space-y-5">
        <h2 className="font-bold text-slate-800 font-ethiopic text-base flex items-center gap-2">
          <span>📊</span>
          <span>
            {isYesterday ? "ትናንት" : "የዛሬ"} የፋብሪካው ጠቅላላ የምርት ማጠቃለያ
          </span>
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
            <span>
              {pendingLines} ሠራተኞች ያስመዘገቧቸው ቁጥሮች ገና አልተረጋገጡም።
              ቀን ከመዝጋቱ በፊት ማረጋገጥ ይመከራል።
            </span>
          </div>
        )}

        {verifiedLines === 0 && lineStats._count._all > 0 && (
          <div className="alert-info font-ethiopic text-xs flex items-center gap-2">
            <span>ℹ️</span>
            <span>
              እስካሁን የተረጋገጠ ቁጥር የለም። የቁጥጥር ሂደቱ ከተጠናቀቀ በኋላ ቀኑን መዝጋት ይችላሉ።
            </span>
          </div>
        )}

        {/* Today is already closed and no yesterday pending */}
        {todayClose && !isYesterday && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-ethiopic bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
            <CheckSquare size={14} className="text-emerald-600 flex-shrink-0" />
            <span>
              የዛሬ ({formatAsEthDate(today)}) ቀን ተዘግቷል።
              ዘጋ፦ {new Date(todayClose.closedAt).toLocaleTimeString("en-ET", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}
      </div>

      {/* Close action — uses workingDate */}
      <DayCloseButton
        date={workingDate.toISOString()}
        alreadyClosed={!!dayClose}
        closedAt={dayClose?.closedAt?.toISOString() ?? null}
      />

      {/* Generate & send PDF report */}
      <GenerateReportButton date={workingDate.toISOString()} />

      {/* Monthly audit log purge — Admin / Super Manager only */}
      {(session.user.role === "ADMIN" || session.user.role === "SUPER_MANAGER") && (
        <PurgeAuditButton />
      )}
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
