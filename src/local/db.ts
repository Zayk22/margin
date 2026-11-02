import Dexie, { type Table } from "dexie";
import { Expense, Category, Budget, RecurringRule, OutboxOp } from "../lib/types";

export type SyncMeta = {
  key: string; // always "cursor"
  value: number;
};

export class MarginDatabase extends Dexie {
  expenses!: Table<Expense, string>;
  categories!: Table<Category, string>;
  budgets!: Table<Budget, string>;
  recurringRules!: Table<RecurringRule, string>;
  outbox!: Table<OutboxOp, string>;
  syncMeta!: Table<SyncMeta, string>;

  constructor(userId: string) {
    super(`margin-${userId}`);
    
    this.version(1).stores({
      expenses: "id, occurredOn, categoryId, updatedAt",
      categories: "id, updatedAt",
      budgets: "id, month, categoryId, updatedAt",
      recurringRules: "id, updatedAt",
      outbox: "opId, createdAt",
    });

    // Version 2: Add syncMeta for storing the pull cursor
    this.version(2).stores({
      syncMeta: "key",
    });
  }
}

let activeDb: MarginDatabase | null = null;

export function getDb(userId: string): MarginDatabase {
  if (!activeDb || activeDb.name !== `margin-${userId}`) {
    if (activeDb) {
      activeDb.close();
    }
    activeDb = new MarginDatabase(userId);
  }
  return activeDb;
}