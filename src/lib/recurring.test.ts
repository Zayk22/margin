import { describe, expect, it } from "vitest";
import { generateMissedOccurrences } from "./recurring";
import { RecurringRule } from "./types";

const baseRule: RecurringRule = {
  id: "rule-123",
  categoryId: "cat-123",
  amountKobo: 500000,
  note: "Rent",
  frequency: "monthly",
  startOn: "2024-01-01",
  endOn: null,
  lastGeneratedOn: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  deletedAt: null,
  deviceId: "device-a",
};

describe("Recurring generation", () => {
  it("generates nothing if startOn is in the future", () => {
    const rule: RecurringRule = { ...baseRule, startOn: "2024-02-01" };
    const expenses = generateMissedOccurrences(rule, "2024-01-15", "device-a");
    expect(expenses).toHaveLength(0);
  });

  it("generates exactly one if startOn is today", () => {
    const rule: RecurringRule = { ...baseRule, startOn: "2024-01-15" };
    const expenses = generateMissedOccurrences(rule, "2024-01-15", "device-a");
    expect(expenses).toHaveLength(1);
    expect(expenses[0].occurredOn).toBe("2024-01-15");
  });

  it("catches up multiple missed periods", () => {
    const rule: RecurringRule = { ...baseRule, startOn: "2024-01-01", frequency: "weekly" };
    const expenses = generateMissedOccurrences(rule, "2024-01-15", "device-a");
    expect(expenses).toHaveLength(3);
    expect(expenses[0].occurredOn).toBe("2024-01-01");
    expect(expenses[1].occurredOn).toBe("2024-01-08");
    expect(expenses[2].occurredOn).toBe("2024-01-15");
  });

  it("stops at endOn", () => {
    const rule: RecurringRule = { ...baseRule, startOn: "2024-01-01", frequency: "weekly", endOn: "2024-01-10" };
    const expenses = generateMissedOccurrences(rule, "2024-01-20", "device-a");
    expect(expenses).toHaveLength(2);
    expect(expenses[1].occurredOn).toBe("2024-01-08");
  });

  it("resumes from lastGeneratedOn without duplicating", () => {
    const rule: RecurringRule = { ...baseRule, startOn: "2024-01-01", frequency: "weekly", lastGeneratedOn: "2024-01-08" };
    const expenses = generateMissedOccurrences(rule, "2024-01-15", "device-a");
    expect(expenses).toHaveLength(1);
    expect(expenses[0].occurredOn).toBe("2024-01-15");
  });

  it("handles monthly edge cases correctly (Jan 31 -> Feb 29 -> Mar 31)", () => {
    const rule: RecurringRule = { ...baseRule, startOn: "2024-01-31", frequency: "monthly" };
    const expenses = generateMissedOccurrences(rule, "2024-03-31", "device-a");
    expect(expenses).toHaveLength(3);
    expect(expenses[0].occurredOn).toBe("2024-01-31");
    expect(expenses[1].occurredOn).toBe("2024-02-29");
    expect(expenses[2].occurredOn).toBe("2024-03-31");
  });

  it("uses deterministic UUID and updatedAt based on occurrence date", () => {
    const rule: RecurringRule = { ...baseRule, startOn: "2024-01-01", frequency: "weekly" };
    const expenses1 = generateMissedOccurrences(rule, "2024-01-08", "device-a");
    const expenses2 = generateMissedOccurrences(rule, "2024-01-08", "device-b");
    
    expect(expenses1).toHaveLength(2);
    expect(expenses2).toHaveLength(2);

    expect(expenses1[0].id).toBe(expenses2[0].id);
    expect(expenses1[0].updatedAt).toBe("2024-01-01T00:00:00.000Z");
    expect(expenses1[1].updatedAt).toBe("2024-01-08T00:00:00.000Z");
  });

  it("does not resurrect a deleted expense because the deterministic updatedAt is older than the delete", () => {
    const rule: RecurringRule = { ...baseRule, startOn: "2024-01-01", frequency: "weekly" };
    const expenses = generateMissedOccurrences(rule, "2024-01-01", "device-a");
    const originalExpense = expenses[0];
    
    const deletedExpense = {
      ...originalExpense,
      deletedAt: "2024-01-05T12:00:00.000Z",
      updatedAt: "2024-01-05T12:00:00.000Z",
    };

    const newExpenses = generateMissedOccurrences(rule, "2024-01-01", "device-b");
    const regeneratedExpense = newExpenses[0];

    expect(regeneratedExpense.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    expect(regeneratedExpense.id).toBe(deletedExpense.id);
  });
});