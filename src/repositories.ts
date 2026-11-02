import { Expense, Category, Budget, RecurringRule } from "../lib/types";
import { MarginDatabase } from "./db";
import { appendToOutbox } from "./outbox";

export async function saveExpense(db: MarginDatabase, expense: Expense): Promise<void> {
  await db.transaction("rw", db.expenses, db.outbox, async () => {
    await db.expenses.put(expense);
    await appendToOutbox(db, "Expense", expense.id, "upsert", JSON.stringify(expense));
  });
}

export async function deleteExpense(db: MarginDatabase, expense: Expense): Promise<void> {
  // Soft delete (tombstone)
  const tombstone: Expense = {
    ...expense,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await db.transaction("rw", db.expenses, db.outbox, async () => {
    await db.expenses.put(tombstone);
    await appendToOutbox(db, "Expense", tombstone.id, "delete", JSON.stringify(tombstone));
  });
}

export async function saveCategory(db: MarginDatabase, category: Category): Promise<void> {
  await db.transaction("rw", db.categories, db.outbox, async () => {
    await db.categories.put(category);
    await appendToOutbox(db, "Category", category.id, "upsert", JSON.stringify(category));
  });
}

export async function saveBudget(db: MarginDatabase, budget: Budget): Promise<void> {
  await db.transaction("rw", db.budgets, db.outbox, async () => {
    await db.budgets.put(budget);
    await appendToOutbox(db, "Budget", budget.id, "upsert", JSON.stringify(budget));
  });
}

export async function saveRecurringRule(db: MarginDatabase, rule: RecurringRule): Promise<void> {
  await db.transaction("rw", db.recurringRules, db.outbox, async () => {
    await db.recurringRules.put(rule);
    await appendToOutbox(db, "RecurringRule", rule.id, "upsert", JSON.stringify(rule));
  });
}