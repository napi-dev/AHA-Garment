"use server";

import { auth } from "@/lib/auth";
import { canResolveAlert } from "@/lib/auth/permissions";
import { resolveAlert } from "@/lib/automation/alerts";
import { revalidatePath } from "next/cache";

export async function resolveAlertAction(alertId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  if (!canResolveAlert(session.user.role)) throw new Error("ፈቃድ የለዎትም");

  await resolveAlert(alertId);
  revalidatePath("/alerts");
}
