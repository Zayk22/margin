/**
 * Escapes a single field for CSV.
 * 1. Prevents formula injection by prepending a single quote if it starts with =, +, -, or @.
 * 2. Wraps in double quotes if it contains commas, quotes, or newlines.
 * 3. Escapes internal double quotes by doubling them.
 */
export function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";

  let str = String(value);

  // Prevent formula injection (CSV Injection)
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }

  // Check if escaping is needed
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    // Double up any internal quotes and wrap the whole thing in quotes
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}