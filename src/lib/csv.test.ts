import { describe, expect, it } from "vitest";
import { escapeCsvField, generateCsvString } from "./csv";
import { Expense, Category } from "./types";

const mockCategory = (id: string, name: string): Category => ({
  id, name, icon: "more-horizontal", colorToken: "cat-9",
  isDefault: false, createdAt: "", updatedAt: "", deletedAt: null, deviceId: "1"
});

const mockExpense = (id: string, amount: number, catId: string, note: string): Expense => ({
  id, amountKobo: amount, categoryId: catId, note, occurredOn: "2024-05-15",
  createdAt: "", updatedAt: "", deletedAt: null, deviceId: "1"
});

describe("CSV Export", () => {
  describe("escapeCsvField", () => {
    it("handles basic strings", () => {
      expect(escapeCsvField("hello")).toBe("hello");
      expect(escapeCsvField(123)).toBe("123");
      expect(escapeCsvField(null)).toBe("");
    });

    it("escapes commas and quotes", () => {
      expect(escapeCsvField("hello, world")).toBe('"hello, world"');
      expect(escapeCsvField('He said "hello"')).toBe('"He said ""hello"""');
    });

    it("prevents formula injection", () => {
      expect(escapeCsvField("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)");
      expect(escapeCsvField("+123")).toBe("'+123");
      expect(escapeCsvField("-123")).toBe("'-123");
      expect(escapeCsvField("@SUM")).toBe("'@SUM");
      expect(escapeCsvField("\t=SUM")).toBe("'\t=SUM");
      expect(escapeCsvField("\r=SUM")).toBe("\"'\r=SUM\"");
    });
  });

  describe("generateCsvString", () => {
    it("generates a valid CSV string with headers, BOM, and correct amounts", () => {
      const categories = [mockCategory("cat-1", "Food")];
      const expenses = [
        mockExpense("1", 15050, "cat-1", "Lunch"),
        mockExpense("2", 100, "cat-missing", "Snack, with comma")
      ];

      const csv = generateCsvString(expenses, categories);
      
      expect(csv.charCodeAt(0)).toBe(0xFEFF);
      const lines = csv.split("\r\n");
      expect(lines[0]).toBe("\uFEFFDate,Category,Note,Amount (NGN)");
      expect(lines[1]).toBe("2024-05-15,Food,Lunch,150.50");
      expect(lines[2]).toBe('2024-05-15,Unknown,"Snack, with comma",1.00');
    });

    it("handles newlines in notes and quotes in category names", () => {
      const categories = [mockCategory("cat-1", 'Food "Special"')];
      const expenses = [mockExpense("1", 1000, "cat-1", "Line 1\nLine 2")];
      
      const csv = generateCsvString(expenses, categories);
      const lines = csv.split("\r\n");
      // The note containing a newline will be quoted, and the category quote will be doubled
      expect(lines[1]).toBe('2024-05-15,"Food ""Special""","Line 1\nLine 2",10.00');
    });
  });
});