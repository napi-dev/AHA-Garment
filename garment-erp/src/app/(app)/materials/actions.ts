"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { StockMovementType } from "@prisma/client";
import { checkAndSendLowStockAlert } from "@/lib/automation/alerts";

// ── Create material ──────────────────────────────────────────────────────────
export async function createMaterial(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "stock:edit");

  const nameAm       = String(formData.get("nameAm") ?? "").trim();
  const nameEn       = String(formData.get("nameEn") ?? "").trim() || null;
  const unit         = String(formData.get("unit") ?? "").trim();
  const minimumLevel = String(formData.get("minimumLevel") ?? "0");

  if (!nameAm || !unit) throw new Error("ስም እና ክፍሎ ያስፈልጋሉ");

  // Auto-generate SKU: MAT-001, MAT-002 …
  const count = await db.material.count();
  const sku   = `MAT-${String(count + 1).padStart(3, "0")}`;

  await db.material.create({
    data: { nameAm, nameEn, unit, minimumLevel, sku },
  });

  revalidatePath("/materials");
  redirect("/materials");
}

// ── Record stock movement ────────────────────────────────────────────────────
export async function recordMovement(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "stock:edit");

  const materialId = String(formData.get("materialId") ?? "");
  const type       = String(formData.get("type") ?? "RECEIVE") as StockMovementType;
  const quantity   = String(formData.get("quantity") ?? "0");
  const lotId      = String(formData.get("lotId") ?? "") || null;
  const reference  = String(formData.get("reference") ?? "") || null;
  const notes      = String(formData.get("notes") ?? "") || null;
  const dateStr    = String(formData.get("date") ?? new Date().toISOString().split("T")[0]);
  const date       = new Date(dateStr + "T00:00:00Z");

  await db.stockMovement.create({
    data: {
      materialId,
      type,
      quantity,
      lotId,
      reference,
      notes,
      date,
      enteredById: session.user.id,
    },
  });

  await db.auditLog.create({
    data: {
      userId:   session.user.id,
      action:   `STOCK_${type}`,
      entity:   "StockMovement",
      entityId: materialId,
      after:    { type, quantity, date: dateStr },
    },
  });

  // Check and fire low-stock alert
  await checkAndSendLowStockAlert(materialId);

  revalidatePath("/materials");
  redirect("/materials");
}
