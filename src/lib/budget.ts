import { Budget } from "./types";

export type BudgetState = "calm" | "near" | "over";

export function getBudgetState(spentKobo: number, budgetKobo: number): BudgetState {
  if (budgetKobo <= 0) return spentKobo > 0 ? "over" : "calm";
  
  if (spentKobo > budgetKobo) return "over";
  if (spentKobo * 100 >= budgetKobo * 80) return "near";
  return "calm";
}

export function createCopiedBudgets(
  previousMonthBudgets: Budget[],
  currentMonth: string,
  existingCurrentBudgets: Budget[],
  deviceId: string
): Budget[] {
  // Idempotency: If the current month already has budgets, do not copy
  if (existingCurrentBudgets.length > 0) return [];

  const now = new Date().toISOString();
  
  return previousMonthBudgets.map((b) => ({
    ...b,
    id: crypto.randomUUID(),
    month: currentMonth,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deviceId,
  }));
}