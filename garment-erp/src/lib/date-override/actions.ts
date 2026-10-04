"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { ethToGregorian, todayEth, type EthDate } from "@/lib/ethiopian-calendar";

const OVERRIDE_KEY = "eth_date_override";

/** Allowed roles that can set/clear the date override */
const CAN_OVERRIDE_ROLES = new Set(["ADMIN", "PRODUCTION_MANAGER"]);

/**
 * Read the active date override from AppSetting.
 * Returns the EthDate if a valid override exists for today or a nearby date,
 * otherwise returns null (caller should use todayEth()).
 *
 * The override is stored as "YYYY-M-D" Ethiopian. It is considered stale and
 * ignored after 2 Gregorian days (i.e. the admin set it, the real day has
 * already passed twice — clearly outdated).
 */
export async function getEthDateOverride(): Promise<EthDate | null> {
  const setting = await db.appSetting.findUnique({ where: { key: OVERRIDE_KEY } });
  if (!setting) return null;

  const parts = setting.value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;

  const [ethYear, ethMonth, ethDay] = parts;
  const overrideDate: EthDate = { year: ethYear, month: ethMonth, day: ethDay };

  // Auto-expire: if the override was last updated more than 2 real days ago, ignore it
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  if (setting.updatedAt < twoDaysAgo) return null;

  return overrideDate;
}

/** Set the active Ethiopian date override (ADMIN or PRODUCTION_MANAGER only). */
export async function setEthDateOverride(
  ethYear: number,
  ethMonth: number,
  ethDay: number
): Promise<{ ok: boolean; message: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ያልተፈቀደ" };
  if (!CAN_OVERRIDE_ROLES.has(session.user.role))
    return { ok: false, message: "ለዚህ ተግባር ፈቃድ የለዎትም" };

  // Basic validation
  if (ethMonth < 1 || ethMonth > 13 || ethDay < 1 || ethDay > 30)
    return { ok: false, message: "ትክክለኛ ያልሆነ ቀን" };

  const value = `${ethYear}-${ethMonth}-${ethDay}`;
  await db.appSetting.upsert({
    where: { key: OVERRIDE_KEY },
    update: { value, updatedBy: session.user.id },
    create: { key: OVERRIDE_KEY, value, updatedBy: session.user.id },
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "ቀኑ ተስተካክሏል" };
}

/** Clear the date override (revert to auto-detected today). */
export async function clearEthDateOverride(): Promise<{ ok: boolean; message: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ያልተፈቀደ" };
  if (!CAN_OVERRIDE_ROLES.has(session.user.role))
    return { ok: false, message: "ለዚህ ተግባር ፈቃድ የለዎትም" };

  await db.appSetting.deleteMany({ where: { key: OVERRIDE_KEY } });
  revalidatePath("/", "layout");
  return { ok: true, message: "የቀን ማሻሻያ ተሰርዟል" };
}
