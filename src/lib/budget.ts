import { Budget } from "./types";
import { v5 as uuidv5 } from "uuid";
import { MARGIN_NAMESPACE } from "./uuid";

export function generateCopiedBudgetId(sourceBudgetId: string, targetMonth: string): string {
  return uuidv5(`${sourceBudgetId}:${targetMonth}`, MARGIN_NAMESPACE);
}

export type BudgetState = "calm" | "near" | "over";

export function getBudgetState(spentKobo: number, budgetKobo: number): BudgetState {
  if (budgetKobo <= 0) return spentKobo > 0 ? "over" : "calm";
  if (spentKobo > budgetKobo) return "over";
  if (spentKobo * 100 >= budgetKobo * 80) return "near";
  return "calm";
}

export function budgetPercent(spentKobo: number, budgetKobo: number): number {
  if (budgetKobo <= 0) return 0;
  return Math.floor((spentKobo * 100) / budgetKobo);
}

export function createCopiedBudgets(
  previousMonthBudgets: Budget[],
  currentMonth: string,
  existingCurrentBudgets: Budget[],
  deviceId: string,
  nowIso: string
): Budget[] {
  if (existingCurrentBudgets.length > 0) return [];

  return previousMonthBudgets.map((b) => ({
    ...b,
    id: generateCopiedBudgetId(b.id, currentMonth),
    month: currentMonth,
    createdAt: nowIso,
    updatedAt: nowIso,
    deletedAt: null,
    deviceId,
  }));
}