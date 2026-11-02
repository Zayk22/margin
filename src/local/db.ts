import Dexie, { type Table } from "dexie";
import { Expense, Category, Budget, RecurringRule, OutboxOp } from "../lib/types";

export class MarginDatabase extends Dexie {
  expenses!: Table<Expense, string>;
  categories!: Table<Category, string>;
  budgets!: Table<Budget, string>;
  recurringRules!: Table<RecurringRule, string>;
  outbox!: Table<OutboxOp, string>;

  constructor(userId: string) {
    super(`margin-${userId}`);
    
    // Schema definition. The first string is the primary key.
    // Subsequent strings are indexes.
    this.version(1).stores({
      expenses: "id, occurredOn, categoryId, updatedAt",
      categories: "id, updatedAt",
      budgets: "id, month, categoryId, updatedAt",
      recurringRules: "id, updatedAt",
      outbox: "opId, createdAt",
    });
  }
}

let activeDb: MarginDatabase | null = null;

/**
 * Returns the Dexie database instance for the given user.
 * If the active instance belongs to a different user, it closes the old one and creates a new one.
 */
export function getDb(userId: string): MarginDatabase {
  if (!activeDb || activeDb.name !== `margin-${userId}`) {
    if (activeDb) {
      activeDb.close();
    }
    activeDb = new MarginDatabase(userId);
  }
  return activeDb;
}