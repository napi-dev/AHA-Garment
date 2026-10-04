"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";

export async function updateIncentiveCard(
  jobId: string,
  setByUserId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "/settings");

  const targetPerHour = parseInt(String(formData.get("targetPerHour") ?? "0"), 10);
  const ratePerPiece  = new Decimal(String(formData.get("ratePerPiece") ?? "0"));
  const dateStr       = String(formData.get("effectiveFrom") ?? new Date().toISOString().split("T")[0]);
  const effectiveFrom = new Date(dateStr + "T00:00:00Z");

  // Check if card exists for this exact job and effectiveFrom
  const existing = await db.incentiveCard.findUnique({
    where: { jobId_effectiveFrom: { jobId, effectiveFrom } },
  });

  if (existing) {
    await db.incentiveCard.update({
      where: { id: existing.id },
      data: { targetPerHour, ratePerPiece: ratePerPiece.toDecimalPlaces(4) },
    });
  } else {
    // Close the current open card, then create a new one
    await db.incentiveCard.updateMany({
      where: { jobId, effectiveTo: null },
      data:  { effectiveTo: effectiveFrom },
    });

    await db.incentiveCard.create({
      data: {
        jobId,
        targetPerHour,
        ratePerPiece: ratePerPiece.toDecimalPlaces(4),
        effectiveFrom,
        effectiveTo: null,
        setByUserId: session.user.id,
      },
    });
  }

  await db.auditLog.create({
    data: {
      userId:   session.user.id,
      action:   "UPDATE_INCENTIVE_CARD",
      entity:   "IncentiveCard",
      entityId: jobId,
      after:    { targetPerHour, ratePerPiece: ratePerPiece.toString(), effectiveFrom: dateStr },
    },
  });

  revalidatePath("/settings/incentive-card");
}
