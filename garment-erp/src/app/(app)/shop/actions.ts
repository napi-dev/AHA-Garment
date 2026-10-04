"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import type { Size, ShopSource } from "@prisma/client";
import Decimal from "decimal.js";

// Helper to compute available stock for a specific SKU (typeId, color, size)
export async function getStockBalance(typeId: string, color: string, size: Size): Promise<number> {
  const movements = await db.shopMovement.findMany({
    where: {
      typeId,
      color,
      size,
      voidedAt: null,
    },
    select: {
      type: true,
      qty: true,
    },
  });

  let balance = 0;
  for (const m of movements) {
    if (m.type === "RECEIVE") balance += m.qty;
    else if (m.type === "SALE") balance -= m.qty;
    else if (m.type === "RETURN") balance -= m.qty;
  }
  return balance;
}

export async function recordShopReceive(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ያልተፈቀደ - Unauthorized");
  requirePermission(session.user.role, "/shop/receive");

  const source = formData.get("source") as ShopSource;
  const orderId = (formData.get("orderId") as string) || null;
  const typeId = (formData.get("typeId") as string)?.trim();
  const color = (formData.get("color") as string)?.trim();
  const size = formData.get("size") as Size;
  const qty = parseInt(formData.get("qty") as string, 10);
  const dateStr = (formData.get("date") as string) || new Date().toISOString().split("T")[0];
  const date = new Date(dateStr + "T00:00:00Z");

  // Rule: Server rejects price on receive
  if (formData.has("unitPrice") && formData.get("unitPrice")) {
    throw new Error("የእቃ መቀበያ ላይ ዋጋ ማስገባት አይፈቀድም");
  }

  if (!source || !typeId || !color || !size || isNaN(qty) || qty <= 0) {
    throw new Error("እባክዎ ሁሉንም አስፈላጊ መረጃዎች በትክክል ይሙሉ");
  }

  await db.shopMovement.create({
    data: {
      type: "RECEIVE",
      source,
      orderId,
      typeId,
      color,
      size,
      qty,
      date,
      enteredById: session.user.id,
    },
  });

  revalidatePath("/shop");
  revalidatePath("/shop/receive");
}

export async function recordShopSale(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ያልተፈቀደ - Unauthorized");
  requirePermission(session.user.role, "/shop/sale");

  const typeId = (formData.get("typeId") as string)?.trim();
  const color = (formData.get("color") as string)?.trim();
  const size = formData.get("size") as Size;
  const qty = parseInt(formData.get("qty") as string, 10);
  const unitPriceNum = parseFloat(formData.get("unitPrice") as string);
  const buyerName = (formData.get("buyerName") as string)?.trim() || null;
  const dateStr = (formData.get("date") as string) || new Date().toISOString().split("T")[0];
  const date = new Date(dateStr + "T00:00:00Z");

  if (!typeId || !color || !size || isNaN(qty) || qty <= 0 || isNaN(unitPriceNum) || unitPriceNum < 0) {
    throw new Error("እባክዎ የተሟላና ትክክለኛ መረጃ ያስገቡ");
  }

  // Stock check: quantity > balance → rejected
  const currentBalance = await getStockBalance(typeId, color, size);
  if (qty > currentBalance) {
    throw new Error(
      `በቂ ክምችት የለም! የቀረው ክምችት ${currentBalance} ፍሬ ብቻ ነው። (${qty} መሸጥ አይቻልም)`
    );
  }

  const unitPrice = new Decimal(unitPriceNum);
  const total = unitPrice.times(qty);

  await db.shopMovement.create({
    data: {
      type: "SALE",
      typeId,
      color,
      size,
      qty,
      unitPrice,
      total,
      buyerName,
      date,
      enteredById: session.user.id,
    },
  });

  // Check if balance reached 0 -> alert
  const remaining = currentBalance - qty;
  if (remaining === 0) {
    await db.alert.create({
      data: {
        type: "SHOP_SOLD_OUT",
        message: `የሱቅ እቃ አልቋል: ${typeId} (${color} - ${size}) ቀሪው 0 ደርሷል!`,
      },
    });
  }

  revalidatePath("/shop");
  revalidatePath("/shop/sale");
  return { success: true };
}

export async function recordShopReturn(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ያልተፈቀደ - Unauthorized");
  requirePermission(session.user.role, "/shop/return");

  const typeId = (formData.get("typeId") as string)?.trim();
  const color = (formData.get("color") as string)?.trim();
  const size = formData.get("size") as Size;
  const qty = parseInt(formData.get("qty") as string, 10);
  const reason = (formData.get("reason") as string)?.trim() || "ያልተሸጠ";
  const dateStr = (formData.get("date") as string) || new Date().toISOString().split("T")[0];
  const date = new Date(dateStr + "T00:00:00Z");

  // Rule: Server rejects price on return
  if (formData.has("unitPrice") && formData.get("unitPrice")) {
    throw new Error("የእቃ ተመላሽ ላይ ዋጋ ማስገባት አይፈቀድም");
  }

  if (!typeId || !color || !size || isNaN(qty) || qty <= 0) {
    throw new Error("እባክዎ ሁሉንም አስፈላጊ መረጃዎች በትክክል ይሙሉ");
  }

  // Stock check
  const currentBalance = await getStockBalance(typeId, color, size);
  if (qty > currentBalance) {
    throw new Error(`በሱቅ ውስጥ ያለው ክምችት ${currentBalance} ብቻ ስለሆነ ${qty} መመለስ አይቻልም`);
  }

  await db.shopMovement.create({
    data: {
      type: "RETURN",
      typeId,
      color,
      size,
      qty,
      voidReason: reason,
      date,
      enteredById: session.user.id,
    },
  });

  revalidatePath("/shop");
  revalidatePath("/shop/return");
}

export async function voidShopMovement(movementId: string, voidReason: string) {
  const session = await auth();
  if (!session?.user) throw new Error("ያልተፈቀደ - Unauthorized");
  requirePermission(session.user.role, "/shop");

  if (!voidReason?.trim()) {
    throw new Error("የመሰረዣ ምክንያት መገለጽ አለበት");
  }

  await db.shopMovement.update({
    where: { id: movementId },
    data: {
      voidedAt: new Date(),
      voidReason: voidReason.trim(),
    },
  });

  revalidatePath("/shop");
  return { success: true };
}
