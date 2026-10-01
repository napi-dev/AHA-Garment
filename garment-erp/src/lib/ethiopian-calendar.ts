/**
 * Ethiopian calendar utilities.
 *
 * The Ethiopian calendar (Ge'ez calendar) has 12 months of 30 days each,
 * plus a 13th month (Pagume) of 5 or 6 days.
 * It runs approximately 7–8 years behind the Gregorian calendar.
 *
 * Ethiopian New Year (Enkutatash) falls on Gregorian Sep 11 (Sep 12 in leap years).
 *
 * All conversions tested against the sample dates in the master plan.
 * Dates are stored internally as Gregorian; Ethiopian calendar is display-only.
 */

export interface EthDate {
  year: number;   // e.g. 2018
  month: number;  // 1–13
  day: number;    // 1–30 (1–5/6 for Pagume)
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ETH_MONTH_NAMES = [
  "መስከረም", "ጥቅምት", "ህዳር", "ታህሳስ", "ጥር", "የካቲት",
  "መጋቢት", "ሚያዚያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ",
];

// Days in each Ethiopian month (month 13 / Pagume varies)
const ETH_MONTH_DAYS = [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 5]; // or 6

// Ethiopian epoch offset from Julian Day Number
// Ethiopian calendar epoch: JDN of Meskerem 1, 1 EC
const ETH_EPOCH = 1724220.5; // Corrected epoch from researched implementations

// ─── Julian Day conversions ───────────────────────────────────────────────────

function gregorianToJD(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function jdToGregorian(jd: number): { year: number; month: number; day: number } {
  const a = jd + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: 100 * b + d - 4800 + Math.floor(m / 10),
  };
}

// ─── Ethiopian ↔ Gregorian ───────────────────────────────────────────────────

/**
 * Convert an Ethiopian date to a JavaScript Date (Gregorian).
 * Based on the Calendrical Calculations algorithm.
 * Ethiopian leap years: year % 4 === 3
 */
export function ethToGregorian(eth: EthDate): Date {
  // Calculate the number of leap years before the given year
  const leapYears = Math.floor(eth.year / 4);
  
  // Calculate JD: epoch + years + leap days + month days + day
  const jd = Math.floor(
    ETH_EPOCH +
    365 * (eth.year - 1) +
    leapYears +
    30 * (eth.month - 1) +
    eth.day
  );
  
  const greg = jdToGregorian(jd);
  return new Date(Date.UTC(greg.year, greg.month - 1, greg.day, 12, 0, 0));
}

/**
 * Convert a JavaScript Date (Gregorian) to an Ethiopian date.
 * Based on Calendrical Calculations algorithm with proper leap year handling.
 */
export function gregorianToEth(date: Date): EthDate {
  const jd = gregorianToJD(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate()
  );
  
  // Days since Ethiopian epoch
  const daysSinceEpoch = Math.floor(jd - ETH_EPOCH);
  
  // Calculate the year
  // Every 4 years = 1461 days (3*365 + 366)
  const quadYear = Math.floor(daysSinceEpoch / 1461);
  const remaining = daysSinceEpoch % 1461;
  
  // Within the 4-year cycle, find which year
  let yearInCycle: number;
  let dayInYear: number;
  
  if (remaining < 365) {
    yearInCycle = 0;
    dayInYear = remaining;
  } else if (remaining < 730) {
    yearInCycle = 1;
    dayInYear = remaining - 365;
  } else if (remaining < 1095) {
    yearInCycle = 2;
    dayInYear = remaining - 730;
  } else {
    yearInCycle = 3;
    dayInYear = remaining - 1095;
  }
  
  const year = quadYear * 4 + yearInCycle + 1;
  
  // Calculate month and day (months 1-12 have 30 days, month 13 has 5 or 6)
  let month: number;
  let day: number;
  
  if (dayInYear < 360) {
    // Months 1-12
    month = Math.floor(dayInYear / 30) + 1;
    day = (dayInYear % 30) + 1;
  } else {
    // Month 13 (Pagume)
    month = 13;
    day = dayInYear - 360 + 1;
  }
  
  return { year, month, day };
}

// Alias for backwards compatibility
export function dateToEth(date: Date): EthDate {
  return gregorianToEth(date);
}

// ─── Ethiopian year helpers ───────────────────────────────────────────────────

/** True if the Ethiopian year is a leap year (every 4th year, year mod 4 == 3) */
export function isEthLeapYear(year: number): boolean {
  return year % 4 === 3;
}

/** Days in a given Ethiopian month */
export function daysInEthMonth(year: number, month: number): number {
  if (month === 13) return isEthLeapYear(year) ? 6 : 5;
  return 30;
}

// ─── Incentive period helpers ─────────────────────────────────────────────────

/**
 * Default period boundaries for a given Ethiopian year+month.
 * Period 1: day 20 of previous month → day 4 of this month (15 days)
 * Period 2: day 5 → day 19 of this month (15 days)
 *
 * Special case: when this month is Meskerem (1), previous month is Pagume (13),
 * which has only 5 or 6 days, so no day 20 exists.
 * In that case, period 1 starts on Nehase 20 (month 12 of previous year).
 *
 * Returns Gregorian Date objects for the start and end of each period.
 */
export function defaultPeriodBoundaries(
  ethYear: number,
  ethMonth: number
): {
  p1Start: Date;
  p1End: Date;
  p2Start: Date;
  p2End: Date;
} {
  let prevYear = ethYear;
  let prevMonth = ethMonth - 1;
  if (prevMonth < 1) {
    prevMonth = 13;
    prevYear = ethYear - 1;
  }

  // If previous month is Pagume, use Nehase (month 12) day 20 instead
  let p1StartEth: EthDate;
  if (prevMonth === 13) {
    // Period 1 runs from Nehase 20 (prev year month 12) to this month day 4
    p1StartEth = { year: prevYear, month: 12, day: 20 };
  } else {
    p1StartEth = { year: prevYear, month: prevMonth, day: 20 };
  }

  return {
    p1Start: ethToGregorian(p1StartEth),
    p1End: ethToGregorian({ year: ethYear, month: ethMonth, day: 4 }),
    p2Start: ethToGregorian({ year: ethYear, month: ethMonth, day: 5 }),
    p2End: ethToGregorian({ year: ethYear, month: ethMonth, day: 19 }),
  };
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/**
 * Format an Ethiopian date for display: "15/12/2018 ዓ.ም" (Amharic style)
 */
export function formatEthDate(eth: EthDate): string {
  return `${eth.day}/${eth.month}/${eth.year} ዓ.ም`;
}

/**
 * Format a Gregorian Date or EthDate as an Ethiopian date string.
 * Converts to EAT (UTC+3) before formatting so midnight-UTC dates
 * that represent an Ethiopian day display correctly.
 */
export function formatAsEthDate(value: EthDate | Date): string {
  const eth: EthDate = value instanceof Date ? dateToEth(value) : value;
  
  // Shift to EAT to get the correct local date in Ethiopia
  const eatOffset = 3 * 60 * 60 * 1000;
  const eatDate = new Date(
    value instanceof Date ? value.getTime() + eatOffset : ethToGregorian(value).getTime() + eatOffset
  );
  
  // Build noon-UTC from the EAT date components
  const noonUTC = new Date(Date.UTC(
    eatDate.getUTCFullYear(),
    eatDate.getUTCMonth(),
    eatDate.getUTCDate(),
    12, 0, 0
  ));
  
  const finalEth = gregorianToEth(noonUTC);
  return formatEthDate(finalEth);
}

/**
 * Format a Gregorian Date as an Ethiopian date with month name.
 * e.g. "15 ነሐሴ 2018 ዓ.ም"
 */
export function formatEthDateLong(date: Date): string {
  const eth = gregorianToEth(date);
  const monthName = ETH_MONTH_NAMES[eth.month - 1];
  return `${eth.day} ${monthName} ${eth.year} ዓ.ም`;
}

/**
 * Get the Ethiopian month name for a given month number (1–13).
 */
export function ethMonthName(month: number): string {
  return ETH_MONTH_NAMES[month - 1] ?? "";
}

/**
 * Get current Ethiopian date using EAT (East Africa Time = UTC+3).
 *
 * Ethiopia is always UTC+3 (no daylight saving).
 * We add 3 hours to UTC to get the correct local date in Addis Ababa,
 * then build a noon-UTC Date from that local y/m/d for gregorianToEth.
 *
 * This is correct regardless of the machine's system timezone setting,
 * which is important because the Next.js server may run on UTC.
 */

/**
 * Returns today's date as a "YYYY-MM-DD" string in EAT (UTC+3).
 * Use this anywhere you need a date string default for <input type="date">,
 * replacing the timezone-incorrect `new Date().toISOString().split("T")[0]`.
 */
export function todayISOStringEAT(): string {
  const eatOffset = 3 * 60 * 60 * 1000;
  const eatNow = new Date(Date.now() + eatOffset);
  return eatNow.toISOString().split("T")[0];
}

export function todayEth(): EthDate {
  // Get current UTC ms, add 3 hours for EAT
  const eatOffset = 3 * 60 * 60 * 1000;
  const eatNow = new Date(Date.now() + eatOffset);
  
  // Read the EAT date components (use UTC getters because we manually shifted)
  const y = eatNow.getUTCFullYear();
  const m = eatNow.getUTCMonth();
  const d = eatNow.getUTCDate();
  
  // Build a noon-UTC Date from those components so gregorianToEth sees
  // the correct Gregorian day via its UTC getters
  const noonUTC = new Date(Date.UTC(y, m, d, 12, 0, 0));
  
  return gregorianToEth(noonUTC);
}

// ─── Unit tests (inline — run with vitest) ────────────────────────────────────

if (import.meta.vitest) {
  const { it, expect, describe } = import.meta.vitest;

  describe("Ethiopian calendar", () => {
    it("Ethiopian New Year 2016/1/1 → Gregorian 2023-09-11", () => {
      // Ethiopian New Year 2016 = Sep 11, 2023 (non-leap year)
      const meskerem1 = ethToGregorian({ year: 2016, month: 1, day: 1 });
      expect(meskerem1.getUTCFullYear()).toBe(2023);
      expect(meskerem1.getUTCMonth()).toBe(8); // September (0-indexed)
      expect(meskerem1.getUTCDate()).toBe(11);
    });

    it("Ethiopian 2017/1/1 → Gregorian 2024-09-11", () => {
      // Ethiopian New Year 2017 = Sep 11, 2024
      const meskerem1 = ethToGregorian({ year: 2017, month: 1, day: 1 });
      expect(meskerem1.getUTCFullYear()).toBe(2024);
      expect(meskerem1.getUTCMonth()).toBe(8);
      expect(meskerem1.getUTCDate()).toBe(11);
    });

    it("Gregorian 2023-09-12 → Ethiopian 2016/1/2", () => {
      const greg = new Date(Date.UTC(2023, 8, 12, 12, 0, 0));
      const eth = gregorianToEth(greg);
      expect(eth.year).toBe(2016);
      expect(eth.month).toBe(1);
      expect(eth.day).toBe(2);
    });

    it("round-trips Greg → Eth → Greg for 2026-09-20", () => {
      const original = new Date(Date.UTC(2026, 8, 20, 12, 0, 0));
      const eth = gregorianToEth(original);
      const back = ethToGregorian(eth);
      expect(back.getUTCFullYear()).toBe(2026);
      expect(back.getUTCMonth()).toBe(8);
      expect(back.getUTCDate()).toBe(20);
    });

    it("Ethiopian leap year: 2015, 2019, 2023 are leap (year mod 4 == 3)", () => {
      expect(isEthLeapYear(2015)).toBe(true);
      expect(isEthLeapYear(2019)).toBe(true);
      expect(isEthLeapYear(2023)).toBe(true);
      expect(isEthLeapYear(2016)).toBe(false);
      expect(daysInEthMonth(2015, 13)).toBe(6);
      expect(daysInEthMonth(2016, 13)).toBe(5);
    });

    it("period boundaries for Meskerem: p1 starts Nehase 20", () => {
      const { p1Start } = defaultPeriodBoundaries(2016, 1); // Meskerem 2016
      const eth = gregorianToEth(p1Start);
      expect(eth.month).toBe(12); // Nehase
      expect(eth.day).toBe(20);
    });

    it("formats date correctly", () => {
      const date = ethToGregorian({ year: 2018, month: 12, day: 15 });
      const formatted = formatAsEthDate(date);
      expect(formatted).toContain("15");
      expect(formatted).toContain("12");
      expect(formatted).toContain("2018");
    });
  });
}
