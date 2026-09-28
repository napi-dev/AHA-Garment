/**
 * getEffectiveDate()
 *
 * Single source of truth for "today" across all server pages.
 * Reads the admin-set Ethiopian date override from AppSetting.
 * Falls back to the auto-computed Ethiopian date if no override is active.
 *
 * Returns both:
 *   - eth: EthDate  — Ethiopian year/month/day for display and period logic
 *   - today: Date   — Gregorian Date (noon UTC) for Prisma queries
 *
 * Usage in any server page:
 *   const { eth, today } = await getEffectiveDate();
 */

import { getEthDateOverride } from "./actions";
import { todayEth, ethToGregorian } from "@/lib/ethiopian-calendar";
import type { EthDate } from "@/lib/ethiopian-calendar";

export interface EffectiveDate {
  eth: EthDate;
  today: Date;
  isOverridden: boolean;
}

export async function getEffectiveDate(): Promise<EffectiveDate> {
  const override = await getEthDateOverride();

  if (override) {
    return {
      eth: override,
      today: ethToGregorian(override),
      isOverridden: true,
    };
  }

  const eth = todayEth();
  return {
    eth,
    today: ethToGregorian(eth),
    isOverridden: false,
  };
}
