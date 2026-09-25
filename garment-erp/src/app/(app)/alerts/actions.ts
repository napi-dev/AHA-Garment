"use server";

import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/auth/permissions";
import { resolveAlert } from "@/lib/automation/alerts";
import { revalidatePath } from "next/cache";

export async function resolveAlertAction(alertId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "reports:manage");

  await resolveAlert(alertId);
  revalidatePath("/alerts");
}
