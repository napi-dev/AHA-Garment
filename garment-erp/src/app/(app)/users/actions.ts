"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

export async function createUser(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  if (session.user.role !== "ADMIN") throw new Error("ይህንን ለማድረግ ፈቃድ የለዎትም - ባለቤት ብቻ");

  const employeeCode = String(formData.get("employeeCode") ?? "").trim().toUpperCase();
  const pin          = String(formData.get("pin") ?? "").trim();
  const role         = String(formData.get("role") ?? "LINE_SUPERVISOR") as Role;
  const employeeId   = String(formData.get("employeeId") ?? "").trim() || null;

  if (!employeeCode || pin.length < 4) throw new Error("ኮድ እና ቢያንስ 4-ቁጥር ፒን ያስፈልጋሉ");

  const pinHash = await bcrypt.hash(pin, 10);

  await db.appUser.create({
    data: { employeeCode, pinHash, role, employeeId, isActive: true },
  });

  await db.auditLog.create({
    data: {
      userId:   session.user.id,
      action:   "CREATE_USER",
      entity:   "AppUser",
      entityId: employeeCode,
      after:    { employeeCode, role },
    },
  });

  revalidatePath("/users");
  redirect("/users");
}

export async function updateUser(userId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  if (session.user.role !== "ADMIN") throw new Error("ይህንን ለማድረግ ፈቃድ የለዎትም - ባለቤት ብቻ");

  const role     = String(formData.get("role") ?? "LINE_SUPERVISOR") as Role;
  const isActive = formData.get("isActive") !== "false";

  const before = await db.appUser.findUnique({ where: { id: userId }, select: { role: true, isActive: true } });

  await db.appUser.update({ where: { id: userId }, data: { role, isActive } });

  await db.auditLog.create({
    data: {
      userId:   session.user.id,
      action:   "UPDATE_USER",
      entity:   "AppUser",
      entityId: userId,
      before:   before ?? undefined,
      after:    { role, isActive },
    },
  });

  revalidatePath("/users");
  redirect("/users");
}

export async function resetPin(userId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("ተፈቅዶ አልነበረም");
  if (session.user.role !== "ADMIN") throw new Error("ይህንን ለማድረግ ፈቃድ የለዎትም - ባለቤት ብቻ");

  const newPin = String(formData.get("newPin") ?? "").trim();
  if (newPin.length < 4) throw new Error("ፒን ቢያንስ 4 ቁጥር መሆን አለበት");

  const pinHash = await bcrypt.hash(newPin, 10);
  await db.appUser.update({ where: { id: userId }, data: { pinHash } });

  await db.auditLog.create({
    data: {
      userId:   session.user.id,
      action:   "RESET_PIN",
      entity:   "AppUser",
      entityId: userId,
      after:    { resetAt: new Date().toISOString() },
      reason:   "Admin PIN reset",
    },
  });

  revalidatePath("/users");
  redirect("/users");
}
