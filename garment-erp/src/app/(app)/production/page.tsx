import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { am } from "@/lib/i18n/am";
import Link from "next/link";
import { formatAsEthDate } from "@/lib/ethiopian-calendar";
import { Factory, Plus, Clock, AlertTriangle, CheckCircle2, ChevronRight, Package } from "lucide-react";

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "/production");

  const params = await searchParams;
  const filterStatus = params.status === "all" ? undefined : (params.status?.toUpperCase() ?? "ACTIVE");

  const orders = await db.prodOrder.findMany({
    where: filterStatus ? { status: filterStatus as any } : undefined,
    include: {
      lines: true,
      cutJobs: {
        select: { piecesCut: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const now = new Date();

  const [activeCount, totalCount, completedCount] = await Promise.all([
    db.prodOrder.count({ where: { status: "ACTIVE" } }),
    db.prodOrder.count(),
    db.prodOrder.count({ where: { status: "COMPLETED" } }),
  ]);

  const totalPiecesTarget = orders.reduce((sum, o) => {
    return sum + o.lines.reduce((lSum, l) => lSum + l.qty, 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="erp-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider font-ethiopic">
            <Factory size={14} />
            <span>የምርት ሂደትና ትዕዛዞች</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-ethiopic mt-1">
            {am.production.title}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-ethiopic">
            የፋብሪካው ንቁ ትዕዛዞች፣ የማጠናቀቂያ ጊዜና የ72/48/24 ሰዓት የጊዜ ማስጠንቀቂያዎች
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/production/orders/new"
            className="btn-primary flex items-center gap-2 font-ethiopic shadow-sm"
          >
            <Plus size={16} />
            <span>{am.production.newOrder}</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">ንቁ ትዕዛዞች</p>
            <Factory size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{activeCount}</p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">የተጠናቀቁ</p>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{completedCount}</p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">ጠቅላላ ትዕዛዞች</p>
            <Package size={16} className="text-slate-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{totalCount}</p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 transition-all hover:bg-white hover:shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 font-ethiopic">የፍሬ ዒላማ ድምር</p>
            <Clock size={16} className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">
            {totalPiecesTarget.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Orders List */}
      <div className="erp-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-bold text-slate-900 font-ethiopic">
            የምርት ትዕዛዞች ዝርዝር
          </h2>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-ethiopic">
            <Link
              href="/production?status=active"
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterStatus === "ACTIVE" ? "bg-white font-bold text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              ንቁ ብቻ
            </Link>
            <Link
              href="/production?status=all"
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                !filterStatus ? "bg-white font-bold text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              ሁሉም
            </Link>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <Factory size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-ethiopic text-sm">ምንም የተመዘገበ ትዕዛዝ አልተገኘም</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((order) => {
              const totalQty = order.lines.reduce((s, l) => s + l.qty, 0);
              const cutQty = order.cutJobs.reduce((s, c) => s + c.piecesCut, 0);
              const progressPct = totalQty > 0 ? Math.min(100, Math.round((cutQty / totalQty) * 100)) : 0;

              // Countdown calculation
              const hoursLeft = (order.deadlineAt.getTime() - now.getTime()) / (1000 * 60 * 60);
              let countdownBadge = null;
              if (order.status === "ACTIVE") {
                if (hoursLeft <= 0) {
                  countdownBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                      🔴 ጊዜው አልፏል!
                    </span>
                  );
                } else if (hoursLeft <= 24) {
                  countdownBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      🔴 24 ሰዓት ሲቀር
                    </span>
                  );
                } else if (hoursLeft <= 48) {
                  countdownBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      🟡 48 ሰዓት ሲቀር
                    </span>
                  );
                } else if (hoursLeft <= 72) {
                  countdownBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      🟢 72 ሰዓት ሲቀር
                    </span>
                  );
                }
              }

              return (
                <Link
                  key={order.id}
                  href={`/production/orders/${order.id}`}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors block"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-bold text-blue-700 text-sm">
                        {order.orderNo}
                      </span>
                      {countdownBadge}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          order.status === "ACTIVE"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : order.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {order.status === "ACTIVE" ? "በሂደት ላይ" : order.status === "COMPLETED" ? "የተጠናቀቀ" : "የተሰረዘ"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 font-ethiopic flex-wrap">
                      <span>የመስመሮች ብዛት፦ {order.lines.length}</span>
                      <span>·</span>
                      <span className="font-semibold text-slate-800">
                        ዒላማ፦ {totalQty.toLocaleString()} ፍሬ
                      </span>
                      <span>·</span>
                      <span>የተቆረጠ፦ {cutQty.toLocaleString()} ፍሬ</span>
                      <span>·</span>
                      <span>የማጠናቀቂያ ቀን፦ {formatAsEthDate(order.deadlineAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-32 hidden sm:block">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-400 font-ethiopic">የቆረጣ ሂደት</span>
                        <span className="font-bold text-slate-700 font-mono">{progressPct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    <ChevronRight size={18} className="text-slate-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
