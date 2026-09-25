"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";

export async function createSupplier(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "stock:edit");
  const nameAm  = String(formData.get("nameAm") ?? "").trim();
  const nameEn  = String(formData.get("nameEn") ?? "").trim() || null;
  const contact = String(formData.get("contact") ?? "").trim() || null;
  if (!nameAm) throw new Error("ስም ያስፈልጋል");
  await db.supplier.create({ data: { nameAm, nameEn, contact } });
  revalidatePath("/suppliers");
}

export async function createLot(supplierId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "stock:edit");
  const lotNumber   = String(formData.get("lotNumber") ?? "").trim();
  const receivedAt  = String(formData.get("receivedAt") ?? new Date().toISOString().split("T")[0]);
  const notes       = String(formData.get("notes") ?? "").trim() || null;
  if (!lotNumber) throw new Error("ሎት ቁጥር ያስፈልጋል");
  await db.lot.create({
    data: { supplierId, lotNumber, receivedAt: new Date(receivedAt + "T00:00:00Z"), notes },
  });
  revalidatePath(`/suppliers/${supplierId}/lots`);
}
