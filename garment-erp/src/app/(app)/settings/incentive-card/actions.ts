"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";

export async function updateIncentiveCard(
  departmentId: string,
  setByUserId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "incentive_card:edit");

  const targetPerHour = parseInt(String(formData.get("targetPerHour") ?? "0"), 10);
  const ratePerPiece  = new Decimal(String(formData.get("ratePerPiece") ?? "0"));
  const dateStr       = String(formData.get("effectiveFrom") ?? new Date().toISOString().split("T")[0]);
  const effectiveFrom = new Date(dateStr + "T00:00:00Z");

  // Close existing open card
  await db.incentiveCard.updateMany({
    where: { departmentId, effectiveTo: null },
    data:  { effectiveTo: effectiveFrom },
  });

  // Create new card
  const card = await db.incentiveCard.create({
    data: {
      departmentId,
      targetPerHour,
      ratePerPiece: ratePerPiece.toDecimalPlaces(4),
      effectiveFrom,
      effectiveTo: null,
      setByUserId: session.user.id,
    },
  });

  // Notify Super Manager if Admin made the change
  if (session.user.role === "ADMIN") {
    await db.alert.create({
      data: {
        type: "UNUSUAL_COUNT",
        message: `Admin ${session.user.employeeCode} ኢንሴንቲቭ ካርድ ቀይሯል — ክፍል ID: ${departmentId}. ${targetPerHour}/ሰዓት @ ${ratePerPiece.toFixed(4)} ብር ከ ${dateStr}`,
        reference: card.id,
      },
    });
  }

  await db.auditLog.create({
    data: {
      userId:   session.user.id,
      action:   "UPDATE_INCENTIVE_CARD",
      entity:   "IncentiveCard",
      entityId: card.id,
      after:    { departmentId, targetPerHour, ratePerPiece: ratePerPiece.toFixed(4), effectiveFrom: dateStr },
    },
  });

  revalidatePath("/settings/incentive-card");
}
