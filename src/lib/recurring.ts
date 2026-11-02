import { Expense, RecurringRule, LocalDate } from "./types";
import { parseLocalDate, toLocalDateString } from "./dates";
import { generateRecurringId } from "./uuid";

/**
 * Calculates a specific occurrence date based on the start date and an offset.
 * This is stateless, which avoids the JS Date mutation bug where Feb 29 + 1 month becomes Mar 29.
 */
function getOccurrenceDate(startOn: Date, frequency: "weekly" | "monthly", offset: number): Date {
  if (frequency === "weekly") {
    const next = new Date(startOn);
    next.setDate(next.getDate() + offset * 7);
    return next;
  }

  // Monthly
  const targetYear = startOn.getFullYear();
  const targetMonth = startOn.getMonth() + offset;
  const targetDay = startOn.getDate();

  // Get the last day of the target month
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  
  // Use the original targetDay, but clamp it to the last day of the month (e.g., 31 -> 29 for Feb)
  const finalDay = Math.min(targetDay, lastDayOfTargetMonth);

  // Return a new date set to local midnight
  return new Date(targetYear, targetMonth, finalDay);
}

/**
 * Generates all missed recurring expenses up to the given `today` date.
 */
export function generateMissedOccurrences(
  rule: RecurringRule,
  todayStr: LocalDate,
  currentDeviceId: string
): Expense[] {
  const expenses: Expense[] = [];
  const today = parseLocalDate(todayStr);
  const startOn = parseLocalDate(rule.startOn);
  const endOn = rule.endOn ? parseLocalDate(rule.endOn) : null;

  let offset = 0;
  let currentDate = getOccurrenceDate(startOn, rule.frequency, offset);

  while (currentDate <= today) {
    if (endOn && currentDate > endOn) break;

    const occurredOn = toLocalDateString(currentDate);

    // If we have already generated this occurrence, skip it and move to the next
    if (rule.lastGeneratedOn && occurredOn <= rule.lastGeneratedOn) {
      offset++;
      currentDate = getOccurrenceDate(startOn, rule.frequency, offset);
      continue;
    }

    const deterministicId = generateRecurringId(rule.id, occurredOn);
    const deterministicTimestamp = `${occurredOn}T00:00:00.000Z`;

    expenses.push({
      id: deterministicId,
      amountKobo: rule.amountKobo,
      categoryId: rule.categoryId,
      note: rule.note,
      occurredOn,
      createdAt: deterministicTimestamp,
      updatedAt: deterministicTimestamp,
      deletedAt: null,
      deviceId: currentDeviceId,
    });

    offset++;
    currentDate = getOccurrenceDate(startOn, rule.frequency, offset);
  }

  return expenses;
}