import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requirePermission, getControllableDepartments } from "@/lib/auth/permissions";
import { FlowClient } from "./flow-client";
import { ArrowLeftRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FlowPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  requirePermission(session.user.role, "/flow");

  const [handovers, departments, orders, controllableDeptIds] = await Promise.all([
    db.handover.findMany({
      include: {
        order: { select: { orderNo: true } },
        fromDept: { select: { id: true, nameAm: true } },
        toDept: { select: { id: true, nameAm: true, controllers: true } },
        investigation: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.department.findMany({
      where: { isActive: true },
      orderBy: { flowOrder: "asc" },
      select: {
        id: true,
        nameAm: true,
        flowOrder: true,
        controllers: true,
      },
    }),
    db.prodOrder.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, orderNo: true },
      orderBy: { createdAt: "desc" },
    }),
    getControllableDepartments(session.user.role, db),
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="erp-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 font-ethiopic">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
            <ArrowLeftRight size={16} />
            <span>የምርት እንቅስቃሴና የክፍሎች ርክክብ</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            የርክክብ ቁጥጥር (Department Flow)
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            የላከው ክፍል ① ላክሁ ሲል ተቀባዩ ② ተቀብያለሁ ይላል። ፍልልያ ሲገኝ ወዲያውኑ ውጥረት ምልክት ይሰጣል።
          </p>
        </div>
      </div>

      <FlowClient
        handovers={handovers as any}
        departments={departments as any}
        orders={orders}
        userRole={session.user.role}
        userId={session.user.id}
        controllableDeptIds={controllableDeptIds}
      />
    </div>
  );
}
