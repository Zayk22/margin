import { Expense, Category } from "./types";
import { toLocalDateString } from "./dates";

export function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let str = String(value);
  
  // Prevent formula injection (extended to tab and carriage return)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCsvString(expenses: Expense[], categories: Category[]): string {
  const catMap = categories.reduce((acc, cat) => {
    acc[cat.id] = cat.name;
    return acc;
  }, {} as Record<string, string>);

  const headers = ["Date", "Category", "Note", "Amount (NGN)"];
  
  const rows = expenses.map((e) => {
    const catName = catMap[e.categoryId] || "Unknown";
    const amountStr = `${Math.floor(e.amountKobo / 100)}.${String(e.amountKobo % 100).padStart(2, "0")}`;
    
    return [
      e.occurredOn,
      catName,
      e.note,
      amountStr
    ].map(escapeCsvField).join(",");
  });

  const csvBody = [headers.join(","), ...rows].join("\r\n");
  
  // UTF-8 BOM so Excel recognizes the encoding
  return "\uFEFF" + csvBody;
}

export function getDefaultCsvFilename(): string {
  return `margin-export-${toLocalDateString(new Date())}.csv`;
}