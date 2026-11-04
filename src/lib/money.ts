const formatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const wholeFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatKobo(amountKobo: number): string {
  if (!Number.isInteger(amountKobo)) {
    throw new Error("Amount must be an integer number of kobo");
  }
  return formatter.format(amountKobo / 100);
}

export function formatKoboParts(amountKobo: number): { whole: string; decimal: string } {
  if (!Number.isInteger(amountKobo)) {
    throw new Error("Amount must be an integer number of kobo");
  }
  
  const isNegative = amountKobo < 0;
  const absKobo = Math.abs(amountKobo);
  
  const wholeNaira = Math.floor(absKobo / 100);
  const decimalKobo = absKobo % 100;
  
  const wholeStr = wholeFormatter.format(wholeNaira);
  const decimalStr = String(decimalKobo).padStart(2, "0");
  
  const sign = isNegative ? "-" : "";
  
  // wholeFormatter might include .00 if the locale insists, but maxFractionDigits: 0 prevents it.
  return {
    whole: `${sign}${wholeStr}`,
    decimal: `.${decimalStr}`
  };
}

export function parseKobo(input: string): number {
  const sanitized = input.trim();
  if (sanitized === "") return 0;

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