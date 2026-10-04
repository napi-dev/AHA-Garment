import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { recordDefect } from "../actions";
import Link from "next/link";
import { CheckSquare, AlertTriangle, ArrowLeft, FileText } from "lucide-react";

export default async function NewDefectPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "/quality");

  // Active orders
  const orders = await db.prodOrder.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, orderNo: true },
    orderBy: { createdAt: "desc" },
  });

  // Departments for responsible dept selection
  const departments = await db.department.findMany({
    where: { isActive: true },
    orderBy: { flowOrder: "asc" },
    select: { id: true, nameAm: true },
  });

  const DEFECT_TYPES = [
    "ስፌት ስህተት", "ጨርቅ ጉዳት", "ቀለም ስህተት", "ልኬት ስህተት",
    "ቁልፍ ጉዳት", "ዚፕ ጉዳት", "ቆሻሻ", "ሌላ",
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/quality"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 font-ethiopic"
        >
          <ArrowLeft size={14} />
          <span>ወደ ጥራት ቁጥጥር ዝርዝር ተመለስ</span>
        </Link>
      </div>

      {/* Header Info */}
      <div className="erp-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 uppercase tracking-wider font-ethiopic">
          <CheckSquare size={14} />
          <span>አዲስ ጉድለት መዝግብ</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          የጥራት ጉድለት ቀረጻ
        </h1>
        <p className="text-slate-500 font-ethiopic text-sm mt-0.5">
          በምርት ሂደት ላይ የተገኘ ጉድለት ያስመዘግቡ
        </p>
      </div>

      <form action={recordDefect} className="space-y-6">
        {/* Order Selection */}
        <div className="erp-card p-6">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-ethiopic">
            የምርት ትዕዛዝ *
          </label>
          <select name="orderId" required className="input-field font-ethiopic text-sm">
            <option value="">— ትዕዛዝ ይምረጡ —</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>{o.orderNo}</option>
            ))}
          </select>
        </div>

        {/* Defect Details */}
        <div className="erp-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <h2 className="font-bold text-slate-800 font-ethiopic text-base">የጉድለት ዝርዝር</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-ethiopic">
                {am.qc.defectType} *
              </label>
              <select name="defectType" required className="input-field font-ethiopic text-xs py-2">
                <option value="">— ይምረጡ —</option>
                {DEFECT_TYPES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-ethiopic">
                ተጠያቂ ክፍል *
              </label>
              <select name="responsibleDeptId" required className="input-field font-ethiopic text-xs py-2">
                <option value="">— ክፍል ይምረጡ —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.nameAm}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-ethiopic">
                {am.qc.piecesAffected} *
              </label>
              <input
                name="piecesAffected"
                type="number"
                min="1"
                required
                className="input-field tabular-nums text-xs py-2"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-ethiopic">
                {am.date}
              </label>
              <input
                name="date"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                className="input-field text-xs py-2"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="erp-card p-6">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-ethiopic flex items-center gap-1.5">
            <FileText size={14} className="text-slate-400" />
            <span>{am.notes} (አማራጭ)</span>
          </label>
          <textarea
            name="notes"
            rows={2}
            className="input-field font-ethiopic resize-none"
            placeholder="ተጨማሪ የጥራት ማስታወሻ..."
          />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="btn-primary flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            <CheckSquare size={16} />
            <span>ጉድለቱን መዝግብ</span>
          </button>
          <Link
            href="/quality"
            className="btn-secondary flex-1"
          >
            {am.cancel}
          </Link>
        </div>
      </form>
    </div>
  );
}
