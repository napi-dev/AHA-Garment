"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";

export async function savePeriodConfig(
  ethYear: number,
  ethMonth: number,
  savedByUserId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "settings:manage");

  const p1Start = new Date(String(formData.get("p1Start")) + "T00:00:00Z");
  const p1End   = new Date(String(formData.get("p1End"))   + "T00:00:00Z");
  const p2Start = new Date(String(formData.get("p2Start")) + "T00:00:00Z");
  const p2End   = new Date(String(formData.get("p2End"))   + "T00:00:00Z");

  // Validate order
  if (p1Start >= p1End) throw new Error("ወቅት 1 ጀምር ከጨርሻ ቀደም ማለት አለበት");
  if (p2Start >= p2End) throw new Error("ወቅት 2 ጀምር ከጨርሻ ቀደም ማለት አለበት");
  if (p1End > p2Start) throw new Error("ወቅት 1 ጨርሻ ከወቅት 2 ጀምር ቀደም ማለት አለበት");

  await db.periodConfig.upsert({
    where: { ethYear_ethMonth: { ethYear, ethMonth } },
    update: { period1Start: p1Start, period1End: p1End, period2Start: p2Start, period2End: p2End },
    create: { ethYear, ethMonth, period1Start: p1Start, period1End: p1End, period2Start: p2Start, period2End: p2End },
  });

  await db.auditLog.create({
    data: {
      userId:   session.user.id,
      action:   "SAVE_PERIOD_CONFIG",
      entity:   "PeriodConfig",
      entityId: `${ethYear}-${ethMonth}`,
      after:    { ethYear, ethMonth, p1Start: p1Start.toISOString(), p1End: p1End.toISOString(), p2Start: p2Start.toISOString(), p2End: p2End.toISOString() },
    },
  });

  revalidatePath("/settings/periods");
}
