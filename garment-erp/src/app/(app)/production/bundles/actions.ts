"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import type { BundleStage } from "@prisma/client";

export async function advanceBundleStage(
  bundleId: string,
  nextStage: string,
  userId: string
) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "bundles:edit");

  if (!nextStage) throw new Error("ቀጣይ ደረጃ የለም");

  await db.bundle.update({
    where: { id: bundleId },
    data: {
      currentStage: nextStage as BundleStage,
      stageLogs: {
        create: { stage: nextStage as BundleStage, enteredById: session.user.id },
      },
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "ADVANCE_BUNDLE",
      entity: "Bundle",
      entityId: bundleId,
      after: { nextStage },
    },
  });

  revalidatePath("/production/bundles");
}
