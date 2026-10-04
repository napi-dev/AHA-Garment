import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { LayoutGrid, Filter } from "lucide-react";
import { BundleCard } from "./bundle-card";

const STAGES = [
  "RECEIVING","CUTTING","SEWING","TRIMMING",
  "QUALITY_CONTROL","STYLING_HITPRESS","IRONING","PACKING","DELIVERY",
] as const;

const STAGE_AM: Record<string, string> = {
  RECEIVING:"ጥሬ እቃ", CUTTING:"ቆረጣ", SEWING:"ስፌት",
  TRIMMING:"ለቀማ", QUALITY_CONTROL:"ጥራት ፍተሻ", STYLING_HITPRESS:"ሂትፕረስ",
  IRONING:"ካውያ", PACKING:"ማሸግ", DELIVERY:"ማድረስ",
};

const STAGE_COLORS: Record<string, { header: string; card: string; badge: string }> = {
  RECEIVING:        { header:"bg-slate-100 text-slate-700",        card:"border-slate-200",  badge:"bg-slate-100 text-slate-600" },
  CUTTING:          { header:"bg-orange-100 text-orange-700",       card:"border-orange-200", badge:"bg-orange-100 text-orange-600" },
  SEWING:           { header:"bg-blue-100 text-blue-700",           card:"border-blue-200",   badge:"bg-blue-100 text-blue-600" },
  TRIMMING:         { header:"bg-yellow-100 text-yellow-700",       card:"border-yellow-200", badge:"bg-yellow-100 text-yellow-600" },
  QUALITY_CONTROL:  { header:"bg-purple-100 text-purple-700",       card:"border-purple-200", badge:"bg-purple-100 text-purple-600" },
  STYLING_HITPRESS: { header:"bg-pink-100 text-pink-700",           card:"border-pink-200",   badge:"bg-pink-100 text-pink-600" },
  IRONING:          { header:"bg-red-100 text-red-700",             card:"border-red-200",    badge:"bg-red-100 text-red-600" },
  PACKING:          { header:"bg-teal-100 text-teal-700",           card:"border-teal-200",   badge:"bg-teal-100 text-teal-600" },
  DELIVERY:         { header:"bg-green-100 text-green-700",         card:"border-green-200",  badge:"bg-green-100 text-green-600" },
};

export default async function BundleBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; stage?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "bundles:view");

  const params = await searchParams;

  const bundles = await db.bundle.findMany({
    where: {
      ...(params.order ? { cutJob: { order: { orderNumber: { contains: params.order.toUpperCase() } } } } : {}),
      ...(params.stage ? { currentStage: params.stage as typeof STAGES[number] } : {}),
    },
    include: {
      cutJob: { include: { order: { include: { style: true } } } },
      stageLogs: { orderBy: { enteredAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Group by stage
  const byStage: Record<string, typeof bundles> = {};
  for (const stage of STAGES) byStage[stage] = [];
  for (const b of bundles) byStage[b.currentStage]?.push(b);

  const canAdvance = ["ADMIN","PRODUCTION_MANAGER","PRODUCTION_MANAGER","QC_INSPECTOR","FINISHED_GOODS_MANAGER"].includes(session.user.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="erp-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider font-ethiopic">
            <LayoutGrid size={14} />
            <span>ምርት ክፍል — ቀጥታ ሰሌዳ</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
            የቀጥታ ምርት ሰሌዳ
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-ethiopic">
            ሁሉም ባንድሎች በሂደት ደረጃ — {bundles.length} ባንድሎች
          </p>
        </div>

        {/* Filters */}
        <form method="GET" className="flex gap-2 items-center">
          <Filter size={14} className="text-slate-400" />
          <input name="order" defaultValue={params.order ?? ""} placeholder="ORD-0001"
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm w-28 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono bg-white" />
          <select name="stage" defaultValue={params.stage ?? ""}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-ethiopic focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="">ሁሉም ደረጃዎች</option>
            {STAGES.map((s) => <option key={s} value={s}>{STAGE_AM[s]}</option>)}
          </select>
          <button type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-ethiopic hover:bg-indigo-700 transition-colors font-semibold">
            {am.filter}
          </button>
        </form>
      </div>

      {/* Stage columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {STAGES.map((stage) => {
          const stageBundles = params.stage ? (byStage[params.stage] ?? []) : (byStage[stage] ?? []);
          if (params.stage && params.stage !== stage) return null;
          const colors = STAGE_COLORS[stage];
          return (
            <div key={stage} className="erp-card overflow-hidden">
              <div className={`px-4 py-3 border-b flex items-center justify-between ${colors.header}`}>
                <span className="font-semibold text-sm font-ethiopic">{STAGE_AM[stage]}</span>
                <span className="text-xs font-bold bg-white/60 px-2 py-0.5 rounded-full tabular-nums">
                  {stageBundles.length}
                </span>
              </div>
              <div className="p-3 space-y-2 max-h-[420px] overflow-y-auto">
                {stageBundles.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-5 font-ethiopic">ባንድል የለም</p>
                )}
                {stageBundles.map((b) => (
                  <BundleCard
                    key={b.id}
                    bundle={{
                      id:       b.id,
                      bundleCode: b.bundleCode,
                      quantity: b.quantity,
                      cutJob: {
                        order: {
                          orderNumber: b.cutJob.order.orderNumber,
                          style: { nameAm: b.cutJob.order.style.nameAm },
                        },
                      },
                    }}
                    canAdvance={canAdvance}
                    currentStage={stage}
                    userId={session.user.id}
                    STAGE_AM={STAGE_AM}
                    STAGES={STAGES}
                    colors={colors}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

