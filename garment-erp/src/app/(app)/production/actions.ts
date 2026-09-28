"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ── Garment style ────────────────────────────────────────────────────────────
export async function createStyle(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "bundles:edit");

  const nameAm = String(formData.get("nameAm") ?? "").trim();
  const nameEn = String(formData.get("nameEn") ?? "").trim() || null;
  const count  = await db.garmentStyle.count();
  const code   = `STY-${String(count + 1).padStart(3, "0")}`;

  await db.garmentStyle.create({ data: { nameAm, nameEn, code } });
  revalidatePath("/production/styles");
}

// ── BOM item ─────────────────────────────────────────────────────────────────
export async function upsertBomItem(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "bundles:edit");

  const styleId    = String(formData.get("styleId") ?? "");
  const materialId = String(formData.get("materialId") ?? "");
  const qty        = String(formData.get("qtyPerPiece") ?? "0");
  const unit       = String(formData.get("unit") ?? "");

  await db.bomItem.upsert({
    where: { styleId_materialId: { styleId, materialId } },
    update: { qtyPerPiece: qty, unit },
    create: { styleId, materialId, qtyPerPiece: qty, unit },
  });
  revalidatePath(`/production/styles/${styleId}`);
}

// ── Production order ─────────────────────────────────────────────────────────
export async function createOrder(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "bundles:edit");

  const styleId    = String(formData.get("styleId") ?? "");
  const quantity   = parseInt(String(formData.get("quantity") ?? "0"), 10);
  const customer   = String(formData.get("customer") ?? "").trim() || null;
  const dueDateStr = String(formData.get("dueDate") ?? "").trim();
  const dueDate    = dueDateStr ? new Date(dueDateStr + "T00:00:00Z") : null;

  const count = await db.prodOrder.count();
  const orderNumber = `ORD-${String(count + 1).padStart(4, "0")}`;

  // Default stage route: all 9 stages in order
  const STAGES = [
    "RECEIVING","CUTTING","SEWING","TRIMMING",
    "QUALITY_CONTROL","STYLING_HITPRESS","IRONING","PACKING","DELIVERY",
  ] as const;

  const order = await db.prodOrder.create({
    data: {
      orderNumber, styleId, quantity, customer, dueDate,
    },
  });

  // Ensure the style has default stage routes defined
  for (let i = 0; i < STAGES.length; i++) {
    await db.styleStageRoute.upsert({
      where: { styleId_stage: { styleId, stage: STAGES[i] } },
      update: {},
      create: { styleId, stage: STAGES[i], sortOrder: i + 1 },
    });
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE_ORDER",
      entity: "ProdOrder",
      entityId: order.id,
      after: { orderNumber, styleId, quantity, customer, dueDate: dueDateStr },
    },
  });

  revalidatePath("/production");
  redirect("/production");
}

export async function closeOrder(orderId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "bundles:edit");

  await db.prodOrder.update({ where: { id: orderId }, data: { isActive: false } });
  revalidatePath("/production");
  redirect("/production");
}
