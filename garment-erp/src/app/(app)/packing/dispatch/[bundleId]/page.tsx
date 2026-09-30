import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { dispatchBundle } from "../../actions";
import Link from "next/link";
import { Truck, Package, ArrowLeft, Building2, Layers, Calendar, FileText } from "lucide-react";

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

  // Use EAT (UTC+3) for the default dispatch date
  const eatNow = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const today  = eatNow.toISOString().split("T")[0];
  const action = dispatchBundle.bind(null, bundleId, session.user.id);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Navigation / Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/packing"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 font-ethiopic"
        >
          <ArrowLeft size={14} />
          <span>ወደ ማሸጊያና ርክክብ ዝርዝር ተመለስ</span>
        </Link>
      </div>

      <div className="erp-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 uppercase tracking-wider font-ethiopic">
          <Truck size={14} />
          <span>{am.packing.title}</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          {am.packing.dispatch} — <span className="font-mono text-teal-700">{bundle.bundleCode}</span>
        </h1>
        <p className="text-slate-500 font-ethiopic text-sm mt-0.5">
          ለደንበኛ የሚላከውን ወይም የሚረከበውን የተጠናቀቀ ምርት ዝርዝር እዚህ ያረጋግጡ
        </p>

        {/* Bundle Summary Banner */}
        <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-xs text-slate-500 font-ethiopic block">{am.production.styles}</span>
            <span className="font-semibold text-slate-900 font-ethiopic text-sm">
              {bundle.cutJob.order.style.nameAm}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 font-ethiopic block">የትዕዛዝ ቁጥር</span>
            <span className="font-mono text-xs font-bold text-slate-800">
              {bundle.cutJob.order.orderNumber}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 font-ethiopic block">የባንድል ፍሬ ብዛት</span>
            <span className="font-bold text-emerald-700 tabular-nums text-sm">
              {bundle.quantity.toLocaleString()} ፍሬ
            </span>
          </div>
        </div>
      </div>

      {/* Dispatch Form Card */}
      <form action={action} className="erp-card p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-ethiopic flex items-center gap-1.5">
            <Building2 size={14} className="text-slate-400" />
            <span>{am.packing.customer} *</span>
          </label>
          <input
            name="customer"
            required
            defaultValue={bundle.cutJob.order.customer ?? ""}
            className="input-field font-ethiopic"
            placeholder="የተረካቢ ደንበኛ ወይም ድርጅት ስም"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-ethiopic flex items-center gap-1.5">
              <Package size={14} className="text-slate-400" />
              <span>{am.packing.piecesDispatched} *</span>
            </label>
            <input
              name="quantity"
              type="number"
              min="1"
              max={bundle.quantity}
              defaultValue={bundle.quantity}
              required
              className="input-field tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-ethiopic flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" />
              <span>{am.packing.dispatchDate}</span>
            </label>
            <input
              name="dispatchedAt"
              type="date"
              defaultValue={today}
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-ethiopic flex items-center gap-1.5">
            <FileText size={14} className="text-slate-400" />
            <span>{am.notes} (የካርቶን ቁጥር ወይም ማስታወሻ)</span>
          </label>
          <textarea
            name="notes"
            rows={2}
            className="input-field font-ethiopic resize-none"
            placeholder="ምሳሌ፦ ካርቶን #04፣ በደረሰኝ ቁጥር..."
          />
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
          <button
            type="submit"
            className="btn-primary flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
          >
            <Truck size={16} />
            <span>{am.packing.dispatch}</span>
          </button>
          <Link
            href="/packing"
            className="btn-secondary flex-1"
          >
            {am.cancel}
          </Link>
        </div>
      </form>
    </div>
  );
}
