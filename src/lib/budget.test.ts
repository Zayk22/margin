import { describe, expect, it } from "vitest";
import { getBudgetState, createCopiedBudgets } from "./budget";
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
    expect(getBudgetState(7999, 10000)).toBe("calm");   // 79.99%
    expect(getBudgetState(8000, 10000)).toBe("near");   // 80.00%
    expect(getBudgetState(10000, 10000)).toBe("near");  // 100.00%
    expect(getBudgetState(10001, 10000)).toBe("over");  // 100.01%
  });
});

describe("createCopiedBudgets", () => {
  const mockBudget = (id: string, amount: number): Budget => ({
    id, categoryId: "cat-1", month: "2024-04", amountKobo: amount,
    createdAt: "", updatedAt: "", deletedAt: null, deviceId: "device-1"
  });

  it("copies budgets and updates month, ids, and timestamps", () => {
    const prev = [mockBudget("1", 10000), mockBudget("2", 20000)];
    const copied = createCopiedBudgets(prev, "2024-05", [], "device-2");
    
    expect(copied).toHaveLength(2);
    expect(copied[0].month).toBe("2024-05");
    expect(copied[0].id).not.toBe("1");
    expect(copied[0].deviceId).toBe("device-2");
    expect(copied[0].amountKobo).toBe(10000);
  });

  it("returns empty array if current month already has budgets", () => {
    const prev = [mockBudget("1", 10000)];
    const current = [mockBudget("3", 5000)];
    const copied = createCopiedBudgets(prev, "2024-05", current, "device-1");
    expect(copied).toHaveLength(0);
  });
});