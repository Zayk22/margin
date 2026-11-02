export type BudgetState = "calm" | "near" | "over";

/**
 * Calculates the budget state based on spent and budgeted kobo.
 * Calm: < 80%
 * Near limit: 80% to 100% (inclusive)
 * Over: > 100%
 */
export function getBudgetState(spentKobo: number, budgetKobo: number): BudgetState {
  // Prevent division by zero and handle cases where no budget is set
  if (budgetKobo <= 0) {
    return spentKobo > 0 ? "over" : "calm";
  }

  const ratio = spentKobo / budgetKobo;

  if (ratio > 1) {
    return "over";
  }
  if (ratio >= 0.8) {
    return "near";
  }
  return "calm";
}