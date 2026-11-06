import { describe, it, expect, beforeEach } from "vitest";
import { MarginDatabase, getDb } from "./db";
import { runRecurringGeneration } from "./recurring-engine";
import { RecurringRule, Expense } from "../lib/types";

describe("Recurring Engine", () => {
  let db: MarginDatabase;

  beforeEach(async () => {
    db = getDb("recurring-test-" + crypto.randomUUID());
    await db.open();
  });

  const createRule = async (overrides: Partial<RecurringRule> = {}) => {
    const rule: RecurringRule = {
      id: "rule-1",
      categoryId: "cat-1",
      amountKobo: 500000,
      note: "Rent",
      frequency: "monthly",
      startOn: "2024-01-01",
      endOn: null,
      lastGeneratedOn: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      deletedAt: null,
      deviceId: "device-1",
      ...overrides,
    };
    await db.recurringRules.put(rule);
    return rule;
  };

  it("runs twice without creating duplicates", async () => {
    await createRule();
    // Today is Jan 15. Should generate Jan 1.
    await runRecurringGeneration(db, "device-1", "2024-01-15", "2024-01-15T12:00:00.000Z");
    
    let expenses = await db.expenses.toArray();
    expect(expenses).toHaveLength(1);

    // Run again on the same day
    await runRecurringGeneration(db, "device-1", "2024-01-15", "2024-01-15T18:00:00.000Z");
    
    expenses = await db.expenses.toArray();
    expect(expenses).toHaveLength(1);
    
    const rule = await db.recurringRules.get("rule-1");
    expect(rule?.lastGeneratedOn).toBe("2024-01-01");
  });

  it("catches up three missed months", async () => {
    await createRule(); // Starts Jan 1
    // Today is Apr 15. Should generate Jan 1, Feb 1, Mar 1, Apr 1 (4 months).
    await runRecurringGeneration(db, "device-1", "2024-04-15", "2024-04-15T12:00:00.000Z");
    
    const expenses = await db.expenses.toArray();
    expect(expenses).toHaveLength(4);
    
    const rule = await db.recurringRules.get("rule-1");
    expect(rule?.lastGeneratedOn).toBe("2024-04-01");
  });

  it("respects endOn", async () => {
    await createRule({ endOn: "2024-02-15" }); // Starts Jan 1, ends Feb 15
    // Today is Apr 15. Should generate Jan 1, Feb 1. Stops before Mar 1.
    await runRecurringGeneration(db, "device-1", "2024-04-15", "2024-04-15T12:00:00.000Z");
    
    const expenses = await db.expenses.toArray();
    expect(expenses).toHaveLength(2);
  });

  it("does not resurrect a deleted generated expense", async () => {
    await createRule();
    await runRecurringGeneration(db, "device-1", "2024-01-15", "2024-01-15T12:00:00.000Z");
    
    const expenses = await db.expenses.toArray();
    const original = expenses[0];
    
    // User deletes the expense on Jan 10 (after it was generated, but with a future date)
    const tombstone: Expense = {
      ...original,
      deletedAt: "2024-01-10T12:00:00.000Z",
      updatedAt: "2024-01-10T12:00:00.000Z",
    };
    await db.expenses.put(tombstone);

    // Run generation again on Jan 15
    await runRecurringGeneration(db, "device-1", "2024-01-15", "2024-01-15T18:00:00.000Z");
    
    const finalExpenses = await db.expenses.toArray();
    expect(finalExpenses).toHaveLength(1);
    expect(finalExpenses[0].deletedAt).toBe("2024-01-10T12:00:00.000Z");
  });
});