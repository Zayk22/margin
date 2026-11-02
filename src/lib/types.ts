export type UUID = string;

export type ISO8601 = string;
export type LocalDate = string; // YYYY-MM-DD
export type MonthString = string; // YYYY-MM

export type Expense = {
  id: UUID;
  amountKobo: number;
  categoryId: UUID;
  note: string;
  occurredOn: LocalDate;
  createdAt: ISO8601;
  updatedAt: ISO8601;
  deletedAt: ISO8601 | null;
  deviceId: UUID;
};

export type Category = {
  id: UUID;
  name: string;
  icon: string;
  colorToken: string;
  isDefault: boolean;
  createdAt: ISO8601;
  updatedAt: ISO8601;
  deletedAt: ISO8601 | null;
  deviceId: UUID;
};

export type Budget = {
  id: UUID;
  categoryId: UUID;
  month: MonthString;
  amountKobo: number;
  createdAt: ISO8601;
  updatedAt: ISO8601;
  deletedAt: ISO8601 | null;
  deviceId: UUID;
};

export type RecurringRule = {
  id: UUID;
  categoryId: UUID;
  amountKobo: number;
  note: string;
  frequency: "weekly" | "monthly";
  startOn: LocalDate;
  endOn: LocalDate | null;
  lastGeneratedOn: LocalDate | null;
  createdAt: ISO8601;
  updatedAt: ISO8601;
  deletedAt: ISO8601 | null;
  deviceId: UUID;
};

export type OutboxOp = {
  opId: UUID;
  entity: "Expense" | "Category" | "Budget" | "RecurringRule";
  entityId: UUID;
  type: "upsert" | "delete";
  payload: string; // JSON stringified entity
  createdAt: ISO8601;
  attempts: number;
};

export type SyncChange = {
  entity: "Expense" | "Category" | "Budget" | "RecurringRule";
  serverSeq: number;
  data: unknown; // The actual entity data
};