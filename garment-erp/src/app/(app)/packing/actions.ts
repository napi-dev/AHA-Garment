"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function dispatchBundle(
  bundleId: string,
  dispatchedById: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "finished_goods:edit");

  const customer     = String(formData.get("customer") ?? "").trim();
  const quantity     = parseInt(String(formData.get("quantity") ?? "0"), 10);
  const dateStr      = String(formData.get("dispatchedAt") ?? new Date().toISOString().split("T")[0]);
  const dispatchedAt = new Date(dateStr + "T00:00:00Z");
  const notes        = String(formData.get("notes") ?? "").trim() || null;

  if (!customer || quantity < 1) throw new Error("ደምበኛ እና ፍሬ ብዛት ያስፈልጋሉ");

  const bundle = await db.bundle.findUnique({
    where: { id: bundleId },
    include: { cutJob: { include: { order: true } } },
  });
  if (!bundle) throw new Error("ባንድሉ አልተገኘም");

  // Create delivery record
  const delivery = await db.delivery.create({
    data: {
      orderId: bundle.cutJob.orderId,
      quantity,
      customer,
      dispatchedAt,
      dispatchedById: session.user.id,
      notes,
    },
  });

  // Advance bundle to DELIVERY stage
  await db.bundle.update({
    where: { id: bundleId },
    data: {
      currentStage: "DELIVERY",
      stageLogs: { create: { stage: "DELIVERY", enteredById: session.user.id } },
    },
  });

  // Check if all bundles for the order are at DELIVERY → mark order complete
  const allBundles = await db.bundle.findMany({
    where: { cutJob: { orderId: bundle.cutJob.orderId } },
    select: { currentStage: true },
  });
  const allDelivered = allBundles.every((b) => b.currentStage === "DELIVERY");
  if (allDelivered) {
    await db.prodOrder.update({
      where: { id: bundle.cutJob.orderId },
      data: { isActive: false },
    });
  }

  await db.auditLog.create({
    data: {
      userId:   session.user.id,
      action:   "DISPATCH_BUNDLE",
      entity:   "Delivery",
      entityId: delivery.id,
      after:    { bundleId, customer, quantity, dispatchedAt: dateStr },
    },
  });

  revalidatePath("/packing");
  revalidatePath("/production");
  redirect("/packing");
}
