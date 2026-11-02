const formatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats an integer amount of kobo into a Naira string (e.g., 150050 -> "₦1,500.50").
 */
export function formatKobo(amountKobo: number): string {
  if (!Number.isInteger(amountKobo)) {
    throw new Error("Amount must be an integer number of kobo");
  }
  return formatter.format(amountKobo / 100);
}

/**
 * Parses a string (e.g., from a keypad or input field) into an integer number of kobo.
 * Throws if the string contains invalid characters or represents an invalid amount.
 */
export function parseKobo(input: string): number {
  const sanitized = input.trim();
  if (sanitized === "") return 0;

  // Match an optional negative sign, digits, an optional decimal point, and up to 2 decimal places
  const match = sanitized.match(/^-?\d+(\.\d{1,2})?$/);
  if (!match) {
    throw new Error(`Invalid money format: ${input}`);
  }

  const isNegative = sanitized.startsWith("-");
  const absStr = isNegative ? sanitized.slice(1) : sanitized;
  const [wholeStr, decimalStr = ""] = absStr.split(".");

  const whole = BigInt(wholeStr);
  const decimals = BigInt(decimalStr.padEnd(2, "0"));

  const kobo = whole * BigInt(100) + decimals;
  const result = Number(kobo);

  return isNegative ? -result : result;
}