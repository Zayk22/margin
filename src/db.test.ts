import { describe, expect, it, beforeEach } from "vitest";
import { getDb } from "./db";
import { saveExpense, deleteExpense } from "./repositories";
import { Expense } from "../lib/types";

describe("Dexie Local Database", () => {
  beforeEach(async () => {
    const db = getDb("test-user");
    await db.expenses.clear();
    await db.outbox.clear();
  });

  it("creates a separate database per user", () => {
    const db1 = getDb("user-1");
    const db2 = getDb("user-2");
    expect(db1.name).toBe("margin-user-1");
    expect(db2.name).toBe("margin-user-2");
  });

  it("saves an expense and appends to outbox atomically", async () => {
    const db = getDb("test-user");
    const expense: Expense = {
      id: "exp-1",
      amountKobo: 5000,
      categoryId: "cat-1",
      note: "Lunch",
      occurredOn: "2024-05-15",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      deviceId: "device-a",
    };

    await saveExpense(db, expense);

    const savedExpense = await db.expenses.get("exp-1");
    expect(savedExpense).toBeDefined();
    expect(savedExpense?.amountKobo).toBe(5000);

    const outboxOps = await db.outbox.toArray();
    expect(outboxOps).toHaveLength(1);
    expect(outboxOps[0].entity).toBe("Expense");
    expect(outboxOps[0].type).toBe("upsert");
    expect(outboxOps[0].entityId).toBe("exp-1");
  });

  it("soft deletes an expense and appends a delete op to outbox", async () => {
    const db = getDb("test-user");
    const expense: Expense = {
      id: "exp-2",
      amountKobo: 5000,
      categoryId: "cat-1",
      note: "Lunch",
      occurredOn: "2024-05-15",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      deviceId: "device-a",
    };

    await saveExpense(db, expense);
    await deleteExpense(db, expense);

    const deletedExpense = await db.expenses.get("exp-2");
    expect(deletedExpense?.deletedAt).not.toBeNull();

    const outboxOps = await db.outbox.toArray();
    expect(outboxOps).toHaveLength(2);
    expect(outboxOps[1].type).toBe("delete");
  });
});