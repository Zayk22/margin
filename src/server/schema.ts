import { pgTable, text, integer, timestamp, boolean, bigint, index, primaryKey } from "drizzle-orm/pg-core";

export const syncCounters = pgTable("sync_counters", {
  userId: text("user_id").primaryKey(),
  seq: integer("seq").notNull().default(0),
});

export const processedOps = pgTable(
  "processed_ops",
  {
    opId: text("op_id").primaryKey(),
    userId: text("user_id").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("processed_ops_user_idx").on(table.userId),
  })
);

export const expenses = pgTable(
  "expenses",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    amountKobo: integer("amount_kobo").notNull(),
    categoryId: text("category_id").notNull(),
    note: text("note").notNull(),
    occurredOn: text("occurred_on").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
    deviceId: text("device_id").notNull(),
    serverSeq: integer("server_seq").notNull(),
  },
  (table) => ({
    userSeqIdx: index("expenses_user_seq_idx").on(table.userId, table.serverSeq),
  })
);

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    icon: text("icon").notNull(),
    colorToken: text("color_token").notNull(),
    isDefault: boolean("is_default").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
    deviceId: text("device_id").notNull(),
    serverSeq: integer("server_seq").notNull(),
  },
  (table) => ({
    userSeqIdx: index("categories_user_seq_idx").on(table.userId, table.serverSeq),
  })
);

export const budgets = pgTable(
  "budgets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    categoryId: text("category_id").notNull(),
    month: text("month").notNull(),
    amountKobo: integer("amount_kobo").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
    deviceId: text("device_id").notNull(),
    serverSeq: integer("server_seq").notNull(),
  },
  (table) => ({
    userSeqIdx: index("budgets_user_seq_idx").on(table.userId, table.serverSeq),
  })
);

export const recurringRules = pgTable(
  "recurring_rules",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    categoryId: text("category_id").notNull(),
    amountKobo: integer("amount_kobo").notNull(),
    note: text("note").notNull(),
    frequency: text("frequency").notNull(), // "weekly" | "monthly"
    startOn: text("start_on").notNull(),
    endOn: text("end_on"),
    lastGeneratedOn: text("last_generated_on"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
    deviceId: text("device_id").notNull(),
    serverSeq: integer("server_seq").notNull(),
  },
  (table) => ({
    userSeqIdx: index("recurring_rules_user_seq_idx").on(table.userId, table.serverSeq),
  })
);