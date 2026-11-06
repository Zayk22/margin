import { MarginDatabase } from "./db";
import { saveExpense, saveRecurringRule } from "./repositories";
import { generateMissedOccurrences } from "../lib/recurring";
import { RecurringRule } from "../lib/types";

export async function runRecurringGeneration(
  db: MarginDatabase,
  deviceId: string,
  todayLocal: string,
  nowIso: string
): Promise<void> {
  const rules = await db.recurringRules.filter(r => !r.deletedAt).toArray();

  for (const rule of rules) {
    const generated = generateMissedOccurrences(rule, todayLocal, deviceId);
    if (generated.length === 0) continue;

    // Find the latest date generated to advance lastGeneratedOn
    const maxDate = generated.reduce((max, exp) => exp.occurredOn > max ? exp.occurredOn : max, "");

    await db.transaction("rw", db.expenses, db.outbox, db.recurringRules, async () => {
      for (const exp of generated) {
        await saveExpense(db, exp);
      }
      
      const updatedRule: RecurringRule = {
        ...rule,
        lastGeneratedOn: maxDate,
        updatedAt: nowIso,
      };
      await saveRecurringRule(db, updatedRule);
    });
  }
}