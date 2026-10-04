"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Size, OrderStatus } from "@prisma/client";

export async function createOrder(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "/production/orders");

  const deadlineDate = String(formData.get("deadlineDate") ?? "");
  const deadlineTime = String(formData.get("deadlineTime") ?? "17:00");
  
  if (!deadlineDate) throw new Error("የማጠናቀቂያ ቀን ያስፈልጋል");
  const deadlineAt = new Date(`${deadlineDate}T${deadlineTime}:00Z`);

  // Lines
  const typeId = String(formData.get("typeId") ?? "ቲ-ሸርት").trim();
  const color  = String(formData.get("color")  ?? "ነጭ").trim();
  const size   = (String(formData.get("size")   ?? "L").toUpperCase()) as Size;
  const qty    = parseInt(String(formData.get("qty") ?? "0"), 10);

  if (qty <= 0) throw new Error("ብዛት ቢያንስ 1 መሆን አለበት");

  // Generate ORD-00001 (5 digits)
  const count = await db.prodOrder.count();
  const orderNo = `ORD-${String(count + 1).padStart(5, "0")}`;

  const order = await db.prodOrder.create({
    data: {
      orderNo,
      deadlineAt,
      status: "ACTIVE",
      createdById: session.user.id,
      lines: {
        create: {
          typeId,
          color,
          size,
          qty,
        },
      },
    },
  });

  await db.auditLog.create({
    data: {
      userId:   session.user.id,
      action:   "CREATE_ORDER",
      entity:   "ProdOrder",
      entityId: order.id,
      after:    { orderNo, deadlineAt: deadlineAt.toISOString(), lines: [{ typeId, color, size, qty }] },
    },
  });

  revalidatePath("/production");
  revalidatePath("/dashboard");
  redirect(`/production/orders/${order.id}`);
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "/production");

  await db.prodOrder.update({
    where: { id: orderId },
    data:  { status },
  });

  await db.auditLog.create({
    data: {
      userId:   session.user.id,
      action:   "UPDATE_ORDER_STATUS",
      entity:   "ProdOrder",
      entityId: orderId,
      after:    { status },
    },
  });

  revalidatePath("/production");
  revalidatePath(`/production/orders/${orderId}`);
}
