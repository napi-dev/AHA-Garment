"use server";

import { auth } from "@/lib/auth";
import { canApproveIncentive, canCloseIncentive } from "@/lib/auth/permissions";
import { closePeriod, approvePeriod } from "@/lib/incentive/periods";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function closePeriodAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  if (!canCloseIncentive(session.user.role)) throw new Error("ፈቃድ የለዎትም");

  const ethYear      = parseInt(String(formData.get("ethYear")      ?? "0"), 10);
  const ethMonth     = parseInt(String(formData.get("ethMonth")     ?? "0"), 10);
  const periodNumber = parseInt(String(formData.get("periodNumber") ?? "1"), 10) as 1 | 2;

  const result = await closePeriod(ethYear, ethMonth, periodNumber, session.user.id);
  revalidatePath("/incentive");
  redirect(`/incentive/${result.periodId}`);
}

export async function approvePeriodAction(periodId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  if (!canApproveIncentive(session.user.role)) throw new Error("ባለቤት (ADMIN) ብቻ ሊያፀድቅ ይችላል");

  await approvePeriod(periodId, session.user.id);
  revalidatePath("/incentive");
  revalidatePath(`/incentive/${periodId}`);
}
