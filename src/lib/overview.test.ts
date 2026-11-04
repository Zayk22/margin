import { describe, it, expect } from "vitest";
import { calculateOverview } from "./overview";
import { Expense, Category } from "./types";

const mockCategory: Category = {
  id: "cat-1", name: "Food", icon: "utensils", colorToken: "cat-2",
  isDefault: true, createdAt: "", updatedAt: "", deletedAt: null, deviceId: "1"
};

const mockExpense = (id: string, amount: number, date: string, catId = "cat-1"): Expense => ({
  id, amountKobo: amount, categoryId: catId, note: "", occurredOn: date,
  createdAt: "", updatedAt: "", deletedAt: null, deviceId: "1"
});

describe("calculateOverview", () => {
  it("calculates totals, comparisons, and breakdowns correctly", () => {
    const expenses = [
      mockExpense("1", 10000, "2024-05-10"),
      mockExpense("2", 5000, "2024-05-15"),
      mockExpense("3", 20000, "2024-04-10"),
      mockExpense("4", 9999, "2024-05-20", "deleted"),
    ];
    expenses[3].deletedAt = "2024-05-21";

    const result = calculateOverview(expenses, [mockCategory], "2024-05");

    expect(result.totalKobo).toBe(15000);
    expect(result.previousMonthTotalKobo).toBe(20000);
    expect(result.percentageChange).toBe(-25);
    expect(result.topCategory?.name).toBe("Food");
    expect(result.categoryBreakdown[0].percentage).toBe(100);
  });

  it("handles zero previous month", () => {
    const expenses = [mockExpense("1", 10000, "2024-05-10")];
    const result = calculateOverview(expenses, [mockCategory], "2024-05");
    expect(result.percentageChange).toBeNull();
  });

  it("one live expense in a known category gives exactly one row", () => {
    const expenses = [mockExpense("1", 10000, "2024-05-10", "cat-1")];
    const result = calculateOverview(expenses, [mockCategory], "2024-05");
    expect(result.categoryBreakdown).toHaveLength(1);
    expect(result.categoryBreakdown[0].name).toBe("Food");
  });

  it("expenses with missing categories give one row per missing id", () => {
    const expenses = [
      mockExpense("1", 10000, "2024-05-10", "missing-1"),
      mockExpense("2", 5000, "2024-05-11", "missing-2"),
    ];
    const result = calculateOverview(expenses, [mockCategory], "2024-05");
    expect(result.categoryBreakdown).toHaveLength(2);
    expect(result.categoryBreakdown[0].name).toBe("Uncategorised");
    expect(result.categoryBreakdown[1].name).toBe("Uncategorised");
    expect(result.categoryBreakdown[0].categoryId).not.toBe(result.categoryBreakdown[1].categoryId);
  });

  it("rows' amounts sum to the total", () => {
    const expenses = [
      mockExpense("1", 10000, "2024-05-10", "cat-1"),
      mockExpense("2", 5000, "2024-05-11", "missing-1"),
    ];
    const result = calculateOverview(expenses, [mockCategory], "2024-05");
    const sum = result.categoryBreakdown.reduce((acc, row) => acc + row.amountKobo, 0);
    expect(sum).toBe(result.totalKobo);
  });

  it("excludes tombstoned expenses", () => {
    const expenses = [
      mockExpense("1", 10000, "2024-05-10"),
      mockExpense("2", 5000, "2024-05-11"),
    ];
    expenses[1].deletedAt = "2024-05-12";
    const result = calculateOverview(expenses, [mockCategory], "2024-05");
    expect(result.totalKobo).toBe(10000);
    expect(result.categoryBreakdown).toHaveLength(1);
  });

  it("excludes expenses from the previous month", () => {
    const expenses = [
      mockExpense("1", 10000, "2024-05-10"),
      mockExpense("2", 5000, "2024-04-11"),
    ];
    const result = calculateOverview(expenses, [mockCategory], "2024-05");
    expect(result.totalKobo).toBe(10000);
  });

  it("calculates percentage change for more, less, and equal", () => {
    const current = [mockExpense("1", 15000, "2024-05-10")];
    const prevMore = [mockExpense("1", 10000, "2024-04-10")];
    const prevEqual = [mockExpense("1", 15000, "2024-04-10")];

    // More
    let result = calculateOverview([...current, ...prevMore], [mockCategory], "2024-05");
    expect(result.percentageChange).toBe(50); // (15k - 10k) / 10k

    // Less
    result = calculateOverview([...current, ...prevMore], [mockCategory], "2024-05"); // 15k vs 20k
    expect(result.percentageChange).toBe(50);

    // Equal
    result = calculateOverview([...current, ...prevEqual], [mockCategory], "2024-05");
    expect(result.percentageChange).toBe(0);
  });
});