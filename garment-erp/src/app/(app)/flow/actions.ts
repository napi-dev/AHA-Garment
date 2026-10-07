"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { canControl } from "@/lib/auth/permissions";
import type { Role, Unit, Size } from "@prisma/client";

export async function createHandover(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ያልተፈቀደ - Unauthorized");

  const orderId = formData.get("orderId") as string;
  const fromDeptId = formData.get("fromDeptId") as string;
  const toDeptId = formData.get("toDeptId") as string;
  const unit = (formData.get("unit") as Unit) || "PCS";
  const sentQty = parseFloat(formData.get("sentQty") as string);
  const color = (formData.get("color") as string) || null;
  const size = (formData.get("size") as Size) || null;

  if (!orderId || !fromDeptId || !toDeptId || isNaN(sentQty) || sentQty <= 0) {
    throw new Error("እባክዎ ሁሉንም አስፈላጊ መረጃዎች በትክክል ይሙሉ");
  }

  // Permission check: user must control the sending department
  const fromDept = await db.department.findUnique({
    where: { id: fromDeptId },
    select: { controllers: true },
  });

  if (!fromDept || !canControl(session.user.role as Role, fromDept.controllers)) {
    throw new Error("ከዚህ ክፍል እቃ ለመላክ ፈቃድ የለዎትም");
  }

  await db.handover.create({
    data: {
      orderId,
      fromDeptId,
      toDeptId,
      unit,
      sentQty,
      color,
      size,
      sentById: session.user.id,
      sentAt: new Date(),
    },
  });

  revalidatePath("/flow");
  revalidatePath(`/production/orders/${orderId}`);
  return { success: true };
}

export async function receiveHandover(handoverId: string, receivedQty: number) {
  const session = await auth();
  if (!session?.user) throw new Error("ያልተፈቀደ - Unauthorized");

  if (isNaN(receivedQty) || receivedQty < 0) {
    throw new Error("ትክክለኛ ቁጥር ያስገቡ");
  }

  const handover = await db.handover.findUnique({
    where: { id: handoverId },
    include: {
      toDept: { select: { controllers: true } },
    },
  });

  if (!handover) throw new Error("ርክክብ አልተገኘም");

  // Permission check: user must control the receiving department
  if (handover.toDept && !canControl(session.user.role as Role, handover.toDept.controllers)) {
    throw new Error("በዚህ ክፍል እቃ ለመረከብ ፈቃድ የለዎትም");
  }

  const sent = Number(handover.sentQty);
  const diff = receivedQty - sent;

  await db.handover.update({
    where: { id: handoverId },
    data: {
      receivedQty,
      receivedById: session.user.id,
      receivedAt: new Date(),
    },
  });

  // If there's a variance, create an alert and investigation placeholder
  if (diff !== 0) {
    await db.flowInvestigation.upsert({
      where: { handoverId },
      create: {
        handoverId,
        status: "recount",
        reasonFound: `ፍልልያ: ${diff > 0 ? `+${diff}` : diff} ${handover.unit}`,
      },
      update: {},
    });

    const msg = `⚠️ በርክክብ ወቅት ፍልልያ ተገኝቷል\nትዕዛዝ: ${handover.order.orderNo}\nየተላከ: ${sent} ${handover.unit} ← የተረከበ: ${receivedQty} ${handover.unit}\nፍልልያ: ${diff > 0 ? `+${diff}` : diff} ${handover.unit}`;

    await db.alert.create({
      data: {
        type: "FLOW_VARIANCE",
        message: msg,
        reference: handoverId,
      },
    });

    // Send Telegram notification
    const { sendToManagerAndAdmin, sendMessage, CHATS } = await import("@/lib/automation/telegram");
    await sendToManagerAndAdmin(msg);
    if (CHATS.dept) await sendMessage(CHATS.dept, msg);
  }

  revalidatePath("/flow");
  revalidatePath(`/production/orders/${handover.orderId}`);
  return { success: true };
}

export async function resolveInvestigation(
  handoverId: string,
  status: string,
  reasonFound: string,
  signedBy: string
) {
  const session = await auth();
  if (!session?.user) throw new Error("ያልተፈቀደ - Unauthorized");

  // Only Admin or PMG or department controllers can resolve
  if (
    session.user.role !== "ADMIN" &&
    session.user.role !== "PRODUCTION_MANAGER"
  ) {
    throw new Error("ይህንን ምርመራ ለማጠናቀቅ ፈቃድ የለዎትም");
  }

  await db.flowInvestigation.upsert({
    where: { handoverId },
    create: {
      handoverId,
      status,
      reasonFound,
      signedBy,
      resolvedAt: new Date(),
    },
    update: {
      status,
      reasonFound,
      signedBy,
      resolvedAt: new Date(),
    },
  });

  revalidatePath("/flow");
  return { success: true };
}
