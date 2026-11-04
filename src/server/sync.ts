import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq, and, gt, sql } from "drizzle-orm";
import ws from "ws";
import { resolveConflict } from "../lib/sync/conflict";
import { OutboxOp, Expense, Category, Budget, RecurringRule } from "../lib/types";
import { validateOp } from "../lib/sync/validate";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

type SyncableEntity = Expense | Category | Budget | RecurringRule;

function getTableForEntity(entity: OutboxOp["entity"]) {
  switch (entity) {
    case "Expense": return schema.expenses;
    case "Category": return schema.categories;
    case "Budget": return schema.budgets;
    case "RecurringRule": return schema.recurringRules;
  }
}

export async function pushSync(userId: string, ops: OutboxOp[]): Promise<{ accepted: string[]; rejected: string[] }> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    return await db.transaction(async (tx) => {
      const acceptedOpIds: string[] = [];
      const rejectedOpIds: string[] = [];

      for (const op of ops) {
        // 1. Idempotency check
        const existingOp = await tx.select()
          .from(schema.processedOps)
          .where(and(eq(schema.processedOps.opId, op.opId), eq(schema.processedOps.userId, userId)));
        
        if (existingOp.length > 0) {
          acceptedOpIds.push(op.opId);
          continue;
        }

        // 2. Validate
        const validation = validateOp(op, Date.now());
        if (!validation.ok) {
          console.warn(`Rejected op ${op.opId}: ${validation.reason}`);
          rejectedOpIds.push(op.opId);
          continue;
        }

        const { data } = validation;

        // 3. Get next serverSeq
        const [counter] = await tx.insert(schema.syncCounters)
          .values({ userId, seq: 1 })
          .onConflictDoUpdate({
            target: schema.syncCounters.userId,
            set: { seq: sql`${schema.syncCounters.seq} + 1` },
          })
          .returning({ seq: schema.syncCounters.seq });

        const newSeq = counter.seq;
        const table = getTableForEntity(op.entity);

        // 4. Fetch existing record
        const existingRecords = await tx.select()
          .from(table)
          .where(and(eq(table.id, op.entityId), eq(table.userId, userId)));
        
        if (existingRecords.length > 0) {
          const existingData = existingRecords[0] as unknown as SyncableEntity;
          const winner = resolveConflict(existingData, data);
          
          if (winner === data) {
            await tx.update(table)
              .set({ ...data, userId, serverSeq: newSeq })
              .where(and(eq(table.id, op.entityId), eq(table.userId, userId)));
          }
        } else {
          await tx.insert(table).values({
            ...data,
            userId,
            serverSeq: newSeq,
          });
        }

        // 5. Mark op as processed
        await tx.insert(schema.processedOps).values({ opId: op.opId, userId });
        acceptedOpIds.push(op.opId);
      }

      return { accepted: acceptedOpIds, rejected: rejectedOpIds };
    });
  } finally {
    await pool.end();
  }
}

// pullSync remains exactly the same as the previous batch
export async function pullSync(userId: string, since: number, limit: number = 500) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    const changes: any[] = [];
    let maxSeq = since;

    const fetchTable = async (table: any, entityName: string) => {
      const rows = await db.select().from(table)
        .where(and(eq(table.userId, userId), gt(table.serverSeq, since)))
        .orderBy(table.serverSeq)
        .limit(limit + 1);
      
      for (const row of rows) {
        changes.push({ entity: entityName, data: row });
        if (row.serverSeq > maxSeq) maxSeq = row.serverSeq;
      }
    };

    await Promise.all([
      fetchTable(schema.expenses, "Expense"),
      fetchTable(schema.categories, "Category"),
      fetchTable(schema.budgets, "Budget"),
      fetchTable(schema.recurringRules, "RecurringRule"),
    ]);

    changes.sort((a, b) => a.data.serverSeq - b.data.serverSeq);
    const hasMore = changes.length > limit;
    const paginatedChanges = changes.slice(0, limit);
    const newCursor = paginatedChanges.length > 0 ? paginatedChanges[paginatedChanges.length - 1].data.serverSeq : since;

    return { changes: paginatedChanges, cursor: newCursor, hasMore };
  } finally {
    await pool.end();
  }
}