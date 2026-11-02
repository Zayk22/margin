import { v5 as uuidv5 } from "uuid";

// Fixed namespace for the Margin app. Do not change this, or all existing recurring IDs will shift.
export const MARGIN_NAMESPACE = "8b7f5c1a-9f2e-4b3c-8a1d-5e6f7a8b9c0d";

/**
 * Generates a deterministic UUID for a recurring expense occurrence.
 * Because the input (ruleId + date) is always the same across all devices,
 * the resulting UUID will always be the same.
 */
export function generateRecurringId(ruleId: string, occurredOn: string): string {
  return uuidv5(`${ruleId}:${occurredOn}`, MARGIN_NAMESPACE);
}