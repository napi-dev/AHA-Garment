"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

  // Check if a card already exists for this exact date — if so, update it instead of creating
  const existing = await db.incentiveCard.findUnique({
    where: { departmentId_effectiveFrom: { departmentId, effectiveFrom } },
  });

  if (existing) {
    // Update in place — same date, just change the rates
    await db.incentiveCard.update({
      where: { id: existing.id },
      data: { targetPerHour, ratePerPiece: ratePerPiece.toDecimalPlaces(4) },
    });
  } else {
    // Close the current open card, then create a new one
    await db.incentiveCard.updateMany({
      where: { departmentId, effectiveTo: null },
      data:  { effectiveTo: effectiveFrom },
    });

    await db.incentiveCard.create({
      data: {
        departmentId,
        targetPerHour,
        ratePerPiece: ratePerPiece.toDecimalPlaces(4),
        effectiveFrom,
        effectiveTo: null,
        setByUserId: session.user.id,
      },
    });
  }

  const card = await db.incentiveCard.findFirst({
    where: { departmentId, effectiveTo: null },
    orderBy: { effectiveFrom: "desc" },
  });

  // Notify Super Manager if Admin made the change
  if (session.user.role === "ADMIN" && card) {
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
      entityId: card?.id ?? departmentId,
      after:    { departmentId, targetPerHour, ratePerPiece: ratePerPiece.toFixed(4), effectiveFrom: dateStr },
    },
  });

  redirect("/settings/incentive-card?saved=1#history");
}
