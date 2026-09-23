"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";

export async function updateSetting(key: string, userId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  requirePermission(session.user.role, "settings:manage");

  const value = String(formData.get("value") ?? "").trim();
  await db.appSetting.upsert({
    where: { key },
    update: { value, updatedBy: session.user.id },
    create: { key, value, updatedBy: session.user.id },
  });
  revalidatePath("/settings");
}

/** Generate a one-time 8-character code for Telegram linking. */
export async function generateTelegramCode(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");

  const userId = String(formData.get("userId") ?? session.user.id);

  // Generate random 8-char alphanumeric code
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  for (const byte of arr) code += chars[byte % chars.length];

  const key = `telegram_link_${code}`;

  // Store code → userId, expires conceptually (no TTL in Prisma; cron can clean up)
  await db.appSetting.upsert({
    where: { key },
    update: { value: userId, updatedBy: userId },
    create: { key, value: userId, updatedBy: userId },
  });

  revalidatePath("/settings");
}
