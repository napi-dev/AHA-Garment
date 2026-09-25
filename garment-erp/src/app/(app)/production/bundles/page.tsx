import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import { advanceBundleStage } from "./actions";

const STAGES = [
  "RECEIVING","CUTTING","SEWING","TRIMMING",
  "QUALITY_CONTROL","STYLING_HITPRESS","IRONING","PACKING","DELIVERY",
] as const;

const STAGE_AM: Record<string, string> = {
  RECEIVING:"ጥሬ እቃ", CUTTING:"ቆረጣ", SEWING:"ስፌት",
  TRIMMING:"ለቀማ", QUALITY_CONTROL:"ጥራት", STYLING_HITPRESS:"ሂትፕረስ",
  IRONING:"ካውያ", PACKING:"ማሸግ", DELIVERY:"ማድረስ",
};

const STAGE_COLOR: Record<string, string> = {
  RECEIVING:"bg-gray-100 text-gray-700",
  CUTTING:"bg-orange-100 text-orange-700",
  SEWING:"bg-blue-100 text-blue-700",
  TRIMMING:"bg-yellow-100 text-yellow-700",
  QUALITY_CONTROL:"bg-purple-100 text-purple-700",
  STYLING_HITPRESS:"bg-pink-100 text-pink-700",
  IRONING:"bg-red-100 text-red-700",
  PACKING:"bg-teal-100 text-teal-700",
  DELIVERY:"bg-green-100 text-green-700",
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

  const canAdvance = ["ADMIN","SUPER_MANAGER","PRODUCTION_MANAGER","QC_INSPECTOR","FINISHED_GOODS_MANAGER"].includes(session.user.role);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">የቀጥታ ረድፍ ሰሌዳ</h1>
        {/* Filters */}
        <form method="GET" className="flex gap-2">
          <input name="order" defaultValue={params.order ?? ""} placeholder="ORD-0001"
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm w-28 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
          <select name="stage" defaultValue={params.stage ?? ""}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-ethiopic focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">ሁሉም ደረጃዎች</option>
            {STAGES.map((s) => <option key={s} value={s}>{STAGE_AM[s]}</option>)}
          </select>
          <button type="submit" className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-ethiopic hover:bg-gray-200">{am.filter}</button>
        </form>
      </div>

      {/* Stage columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {STAGES.map((stage) => {
          const stageBundles = params.stage ? (byStage[params.stage] ?? []) : (byStage[stage] ?? []);
          if (params.stage && params.stage !== stage) return null;
          return (
            <div key={stage} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className={`px-4 py-2.5 border-b border-gray-100 flex items-center justify-between ${STAGE_COLOR[stage]}`}>
                <span className="font-semibold text-sm font-ethiopic">{STAGE_AM[stage]}</span>
                <span className="text-xs font-bold bg-white/60 px-2 py-0.5 rounded-full tabular-nums">
                  {stageBundles.length}
                </span>
              </div>
              <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
                {stageBundles.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4 font-ethiopic">ባንድል የለም</p>
                )}
                {stageBundles.map((b) => (
                  <BundleCard key={b.id} bundle={b} canAdvance={canAdvance}
                    currentStage={stage} userId={session.user.id} STAGE_AM={STAGE_AM} STAGES={STAGES} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BundleCard({
  bundle, canAdvance, currentStage, userId, STAGE_AM, STAGES,
}: {
  bundle: Awaited<ReturnType<typeof db.bundle.findMany>>[0] & {
    cutJob: { order: { orderNumber: string; style: { nameAm: string } } };
  };
  canAdvance: boolean;
  currentStage: string;
  userId: string;
  STAGE_AM: Record<string, string>;
  STAGES: readonly string[];
}) {
  const stageIdx  = STAGES.indexOf(currentStage as typeof STAGES[number]);
  const nextStage = stageIdx < STAGES.length - 1 ? STAGES[stageIdx + 1] : null;
  const action    = advanceBundleStage.bind(null, bundle.id, nextStage ?? "", userId);

  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 hover:border-gray-200 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold text-gray-700 truncate">{bundle.bundleCode}</p>
          <p className="font-ethiopic text-xs text-gray-600 truncate mt-0.5">{bundle.cutJob.order.style.nameAm}</p>
          <p className="text-xs text-gray-400 tabular-nums">{bundle.quantity} ፍሬ</p>
        </div>
        {canAdvance && nextStage && (
          <div className="flex gap-1 flex-col items-end">
            <a href={`/api/tag/${bundle.id}`} target="_blank" rel="noopener noreferrer"
              className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-200 transition-colors">
              🏷️ ታግ
            </a>
            <form action={action}>
              <button className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded-lg hover:bg-blue-700 transition-colors font-ethiopic whitespace-nowrap">
                → {STAGE_AM[nextStage]}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
