import { describe, expect, it } from "vitest";
import {
  getBudgetState,
  budgetPercent,
  createCopiedBudgets,
  generateCopiedBudgetId,
} from "./budget";
import { Budget } from "./types";

describe("getBudgetState", () => {
  it("returns calm when under 80%", () => {
    expect(getBudgetState(0, 10000)).toBe("calm");
    expect(getBudgetState(7999, 10000)).toBe("calm");
  });

  it("returns near when 80% to 100%", () => {
    expect(getBudgetState(8000, 10000)).toBe("near");
    expect(getBudgetState(10000, 10000)).toBe("near");
  });

  it("returns over when above 100%", () => {
    expect(getBudgetState(10001, 10000)).toBe("over");
  });

  it("handles zero budget gracefully", () => {
    expect(getBudgetState(0, 0)).toBe("calm");
    expect(getBudgetState(100, 0)).toBe("over");
  });

  it("matches exact integer boundaries without float drift", () => {
    expect(getBudgetState(7999, 10000)).toBe("calm");
    expect(getBudgetState(8000, 10000)).toBe("near");
    expect(getBudgetState(10000, 10000)).toBe("near");
    expect(getBudgetState(10001, 10000)).toBe("over");
  });
});

describe("budgetPercent", () => {
  it("floors 79.99% to 79", () => {
    expect(budgetPercent(7999, 10000)).toBe(79);
  });

  it("floors exactly 80% to 80", () => {
    expect(budgetPercent(8000, 10000)).toBe(80);
  });

  it("floors exactly 100% to 100", () => {
    expect(budgetPercent(10000, 10000)).toBe(100);
  });

  it("caps at 100 for 100.01%", () => {
    expect(budgetPercent(10001, 10000)).toBe(100);
    expect(getBudgetState(10001, 10000)).toBe("over");
  });

  it("returns 0 for zero budget", () => {
    expect(budgetPercent(100, 0)).toBe(0);
    expect(budgetPercent(0, 0)).toBe(0);
  });
});

describe("createCopiedBudgets", () => {
  const mockBudget = (id: string, amount: number): Budget => ({
    id,
    categoryId: "cat-1",
    month: "2024-04",
    amountKobo: amount,
    createdAt: "",
    updatedAt: "",
    deletedAt: null,
    deviceId: "device-1",
  });

  // CHANGED: added nowIso to the call (5th argument)
  it("copies budgets and updates month, ids, and timestamps", () => {
    const prev = [mockBudget("1", 10000), mockBudget("2", 20000)];
    const nowIso = "2024-05-01T00:00:00.000Z";
    const copied = createCopiedBudgets(prev, "2024-05", [], "device-2", nowIso);

    expect(copied).toHaveLength(2);
    expect(copied[0].month).toBe("2024-05");
    expect(copied[0].id).not.toBe("1");
    expect(copied[0].deviceId).toBe("device-2");
    expect(copied[0].amountKobo).toBe(10000);
    expect(copied[0].createdAt).toBe(nowIso);
    expect(copied[0].updatedAt).toBe(nowIso);
  });

  // CHANGED: added nowIso to the call (5th argument)
  it("returns empty array if current month already has budgets", () => {
    const prev = [mockBudget("1", 10000)];
    const current = [mockBudget("3", 5000)];
    const nowIso = "2024-05-01T00:00:00.000Z";
    const copied = createCopiedBudgets(prev, "2024-05", current, "device-1", nowIso);
    expect(copied).toHaveLength(0);
  });

  // NEW: determinism across runs
  it("produces identical ids across two runs with different nowIso and deviceId", () => {
    const prev = [mockBudget("1", 10000), mockBudget("2", 20000)];
    const a = createCopiedBudgets(prev, "2024-05", [], "device-a", "2024-05-01T00:00:00.000Z");
    const b = createCopiedBudgets(prev, "2024-05", [], "device-b", "2024-06-15T00:00:00.000Z");

    expect(a[0].id).toBe(b[0].id);
    expect(a[1].id).toBe(b[1].id);
    expect(a[0].id).not.toBe(a[1].id);
  });

  // NEW: helper itself
  it("generateCopiedBudgetId produces the same id for the same inputs and differs for a different month", () => {
    const may = generateCopiedBudgetId("budget-1", "2024-05");
    const june = generateCopiedBudgetId("budget-1", "2024-06");
    expect(may).toBe(generateCopiedBudgetId("budget-1", "2024-05"));
    expect(may).not.toBe(june);
  });
});