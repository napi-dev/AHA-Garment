/**
 * UTC Date Helper
 * 
 * All dates in the system are stored as date-only UTC.
 * This ensures consistent date comparison regardless of timezone.
 * 
 * Rule: Never use setHours(0,0,0,0) or new Date(dateString) directly.
 * Always use these helpers.
 */

/**
 * Convert a date to a date-only UTC string key (YYYY-MM-DD)
 * Used for database queries and comparisons.
 */
export function toDayKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Create a date-only UTC Date from year, month, day
 */
export function createUTCDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Parse a date string (YYYY-MM-DD) to a date-only UTC Date
 */
export function parseUTCDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return createUTCDate(year, month, day);
}

/**
 * Get today's date as date-only UTC
 */
export function todayUTC(): Date {
  const now = new Date();
  return createUTCDate(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    now.getUTCDate()
  );
}

/**
 * Compare two dates (date-only, ignoring time)
 * Returns: -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareDates(a: Date, b: Date): number {
  const aKey = toDayKey(a);
  const bKey = toDayKey(b);
  if (aKey < bKey) return -1;
  if (aKey > bKey) return 1;
  return 0;
}

/**
 * Check if two dates are the same day (UTC)
 */
export function isSameDay(a: Date, b: Date): boolean {
  return toDayKey(a) === toDayKey(b);
}

/**
 * Add days to a date (returns new date-only UTC)
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return createUTCDate(
    result.getUTCFullYear(),
    result.getUTCMonth() + 1,
    result.getUTCDate()
  );
}

/**
 * Get the start of a month (UTC)
 */
export function startOfMonth(year: number, month: number): Date {
  return createUTCDate(year, month, 1);
}

/**
 * Get the end of a month (UTC)
 * Handles Ethiopian calendar with 13 months
 */
export function endOfMonth(year: number, month: number, isEthiopian = false): Date {
  if (isEthiopian) {
    if (month === 13) {
      // Pagume: 5 or 6 days depending on leap year
      const isLeapYear = year % 4 === 3;
      return createUTCDate(year, 13, isLeapYear ? 6 : 5);
    }
    // Normal Ethiopian months have 30 days
    return createUTCDate(year, month, 30);
  }
  
  // Gregorian calendar
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return createUTCDate(year, month, lastDay);
}
