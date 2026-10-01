import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { getEffectiveEthDate } from "@/lib/date-override/effective-date";
import { ethMonthName } from "@/lib/ethiopian-calendar";
import { MonthSelector } from "./month-selector";
import { FileText, Calendar, TrendingUp } from "lucide-react";

export default async function MonthlyReportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "incentive:view");

  const eth = await getEffectiveEthDate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="erp-card p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <FileText size={24} className="text-blue-200" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-ethiopic">የወር ክፍያ ሪፖርት</h1>
            <p className="text-slate-300 text-sm font-ethiopic">ደሞዝ፣ ኢንሴንቲቭ እና መገኘት የወር ማጠቃለያ</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-ethiopic text-blue-200 bg-white/5 rounded-lg px-3 py-2 border border-white/10 w-fit">
          <Calendar size={14} />
          <span>የአሁኑ ወር: {ethMonthName(eth.month)} {eth.year} ዓ.ም</span>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-5">
        <div className="erp-card p-5 border-l-4 border-blue-500">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <FileText size={20} className="text-blue-600" />
            </div>
            <h3 className="font-bold text-slate-800 font-ethiopic">የወር ክፍያ ሰሌዳ</h3>
          </div>
          <p className="text-sm text-slate-600 font-ethiopic leading-relaxed">
            ለሁሉም ሠራተኞች የወር ጠቅላላ ደሞዝ፣ ኢንሴንቲቭ፣ እና መገኘት ይዟል።
          </p>
        </div>

        <div className="erp-card p-5 border-l-4 border-emerald-500">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp size={20} className="text-emerald-600" />
            </div>
            <h3 className="font-bold text-slate-800 font-ethiopic">ኢንሴንቲቭ ማጠቃለያ</h3>
          </div>
          <p className="text-sm text-slate-600 font-ethiopic leading-relaxed">
            በወር ውስጥ የተከፈለው ጠቅላላ የምርት ማበረታቻ ክፍያ።
          </p>
        </div>

        <div className="erp-card p-5 border-l-4 border-purple-500">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <Calendar size={20} className="text-purple-600" />
            </div>
            <h3 className="font-bold text-slate-800 font-ethiopic">የመገኘት ክትትል</h3>
          </div>
          <p className="text-sm text-slate-600 font-ethiopic leading-relaxed">
            የተገኙ ቀናት፣ የሳምንት እረፍት፣ እና ያልተገኙ ቀናት።
          </p>
        </div>
      </div>

      {/* Month Selector */}
      <div className="erp-card p-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-800 font-ethiopic mb-2">ወር እና ዓመት ይምረጡ</h2>
          <p className="text-sm text-slate-500 font-ethiopic">
            የሚፈልጉትን ወር እና ዓመት ከታች ካለው መምረጫ ይምረጡ እና ሪፖርቱን ያውጡ።
          </p>
        </div>

        <MonthSelector currentYear={eth.year} currentMonth={eth.month} />
      </div>

      {/* Instructions */}
      <div className="erp-card p-5 bg-amber-50/50 border border-amber-200">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-amber-700 font-bold">ℹ</span>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-amber-900 font-ethiopic">የሪፖርት አጠቃቀም መመሪያ</h3>
            <ul className="text-sm text-amber-800 font-ethiopic space-y-1.5 list-disc list-inside">
              <li>ወሩን እና ዓመቱን ከዚህ በላይ ካለው መምረጫ ይምረጡ</li>
              <li>"ሪፖርት አውጣ (PDF)" የሚለውን ቁልፍ ይጫኑ</li>
              <li>ሪፖርቱ በአዲስ ገጽ ተከፍቶ ራሱን ችሎ ለማተም ይዘጋጃል</li>
              <li>በአሳሽዎ Ctrl+P በመጫን ወደ PDF ማስቀመጥ ይችላሉ</li>
              <li>ሪፖርቱ ሶስት ክፍሎችን ይዟል: ደሞዝ፣ ኢንሴንቲቭ፣ እና መገኘት</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
