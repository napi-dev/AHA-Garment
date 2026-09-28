import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import { createLot } from "../../actions";
import Link from "next/link";
import { Layers, ArrowRight, Plus } from "lucide-react";

export default async function LotsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "stock:view");

  const { id } = await params;
  const supplier = await db.supplier.findUnique({
    where: { id },
    include: { lots: { orderBy: { receivedAt: "desc" } } },
  });
  if (!supplier) notFound();

  const action = createLot.bind(null, id);
  const today  = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Navigation Link */}
      <div>
        <Link
          href="/suppliers"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors font-ethiopic"
        >
          <ArrowRight size={14} className="rotate-180" />
          <span>ወደ አቅራቢዎች ዝርዝር ተመለስ</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="erp-card p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
          <Layers size={14} />
          <span>የጥሬ ዕቃ ሎቶች (Lots)</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
          {supplier.nameAm}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5 font-ethiopic">
          ከዚህ አቅራቢ የገቡ የጥሬ ዕቃ ጥቅሎችና ሎቶች ዝርዝር
        </p>
      </div>

      {/* Add Lot Form */}
      <form action={action} className="erp-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider font-ethiopic">
          <Plus size={14} className="text-blue-600" />
          <span>አዲስ ሎት (Lot) መዝግብ</span>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
              የሎት ቁጥር <span className="text-rose-500">*</span>
            </label>
            <input
              name="lotNumber"
              required
              placeholder="LOT-2026-001"
              className="input-field font-mono"
            />
          </div>

          <div className="min-w-[150px]">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
              የደረሰበት ቀን
            </label>
            <input
              name="receivedAt"
              type="date"
              defaultValue={today}
              className="input-field"
            />
          </div>

          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-ethiopic">
              ማስታወሻ
            </label>
            <input
              name="notes"
              placeholder="ዝርዝር..."
              className="input-field font-ethiopic"
            />
          </div>

          <button
            type="submit"
            className="btn-primary flex items-center gap-2 px-6 py-3 font-ethiopic h-[46px]"
          >
            <Plus size={16} />
            <span>መዝግብ</span>
          </button>
        </div>
      </form>

      {/* Lots Table */}
      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead>
              <tr>
                <th className="text-center w-36">የሎት ቁጥር</th>
                <th className="text-right">የደረሰበት ቀን</th>
                <th className="text-right">ማስታወሻ</th>
              </tr>
            </thead>
            <tbody>
              {supplier.lots.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-slate-400 font-ethiopic">
                    <Layers size={36} className="mx-auto mb-2 text-slate-300" />
                    <p>ምንም የተመዘገበ ሎት የለም</p>
                  </td>
                </tr>
              ) : (
                supplier.lots.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="font-mono font-semibold text-slate-800 text-center py-3.5">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-xs">
                        {l.lotNumber}
                      </span>
                    </td>
                    <td className="font-ethiopic text-slate-700 text-right py-3.5">
                      {formatAsEthDate(l.receivedAt)}
                    </td>
                    <td className="font-ethiopic text-slate-500 text-right py-3.5 text-xs">
                      {l.notes ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
