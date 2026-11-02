/**
 * Formats a Date object into a local YYYY-MM-DD string.
 * Never use toISOString() for this, as it converts to UTC.
 */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Formats a Date object into a local YYYY-MM string.
 */
export function toLocalMonthString(date: Date): string {
  return toLocalDateString(date).slice(0, 7);
}

/**
 * Parses a local YYYY-MM-DD string into a Date object set to local midnight.
 */
export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split("-");
  if (parts.length !== 3) throw new Error(`Invalid date string: ${dateStr}`);
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  
  const date = new Date(y, m, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m ||
    date.getDate() !== d
  ) {
    throw new Error(`Invalid calendar date: ${dateStr}`);
  }
  return date;
}

/**
 * Returns the first and last day of a given YYYY-MM month string.
 */
export function getMonthBoundaries(monthStr: string): { start: string; end: string } {
  const [y, m] = monthStr.split("-").map(Number);
  // The 0th day of the next month is the last day of this month
  const lastDay = new Date(y, m, 0).getDate();
  return {
    start: `${monthStr}-01`,
    end: `${monthStr}-${String(lastDay).padStart(2, "0")}`,
  };
}

/**
 * Returns the previous month string (YYYY-MM).
 */
export function getPreviousMonth(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  const date = new Date(y, m - 1, 1);
  date.setMonth(date.getMonth() - 1);
  return toLocalMonthString(date);
}