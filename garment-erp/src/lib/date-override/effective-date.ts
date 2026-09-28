/**
 * effective-date.ts
 *
 * Convenience exports used by server pages.
 * All "today" lookups should go through these functions so the admin
 * date override is respected system-wide.
 *
 * getEffectiveDate()    → Gregorian Date (noon UTC, hours zeroed by caller)
 * getEffectiveEthDate() → EthDate { year, month, day }
 * getEffectiveFull()    → { eth, today, isOverridden } (full object)
 */

import { getEthDateOverride } from "./actions";
import { todayEth, ethToGregorian, type EthDate } from "@/lib/ethiopian-calendar";

export type { EthDate };

export interface EffectiveDateFull {
  eth: EthDate;
  today: Date;
  isOverridden: boolean;
}

/**
 * Returns the effective "today" as a Gregorian Date (noon UTC).
 * Callers typically do: today.setUTCHours(0, 0, 0, 0) immediately after.
 */
export async function getEffectiveDate(): Promise<Date> {
  const override = await getEthDateOverride();
  if (override) return ethToGregorian(override);
  return ethToGregorian(todayEth());
}

/**
 * Returns the effective "today" as an Ethiopian date object.
 */
export async function getEffectiveEthDate(): Promise<EthDate> {
  const override = await getEthDateOverride();
  return override ?? todayEth();
}

/**
 * Returns all three values at once — use this when you need both
 * the Gregorian Date and the EthDate in the same page.
 */
export async function getEffectiveFull(): Promise<EffectiveDateFull> {
  const override = await getEthDateOverride();
  if (override) {
    return { eth: override, today: ethToGregorian(override), isOverridden: true };
  }
  const eth = todayEth();
  return { eth, today: ethToGregorian(eth), isOverridden: false };
}
