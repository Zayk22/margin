import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq, and, gt, sql } from "drizzle-orm";
import ws from "ws";
import { resolveConflict } from "../lib/sync/conflict";
import { OutboxOp, Expense, Category, Budget, RecurringRule } from "../lib/types";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

type SyncableEntity = Expense | Category | Budget | RecurringRule;

function getTableForEntity(entity: OutboxOp["entity"]) {
  switch (entity) {
    case "Expense": return schema.expenses;
    case "Category": return schema.categories;
    case "Budget": return schema.budgets;
    case "RecurringRule": return schema.recurringRules;
  }
}

export async function pushSync(userId: string, ops: OutboxOp[]): Promise<string[]> {
  return await db.transaction(async (tx) => {
    const acceptedOpIds: string[] = [];

    for (const op of ops) {
      // 1. Idempotency check
      const existingOp = await tx.select().from(schema.processedOps).where(eq(schema.processedOps.opId, op.opId));
      if (existingOp.length > 0) {
        acceptedOpIds.push(op.opId);
        continue; // Already processed
      }

      // 2. Get next serverSeq for this user atomically
      const [counter] = await tx.insert(schema.syncCounters)
        .values({ userId, seq: 1 })
        .onConflictDoUpdate({
          target: schema.syncCounters.userId,
          set: { seq: sql`${schema.syncCounters.seq} + 1` },
        })
        .returning({ seq: schema.syncCounters.seq });

      const newSeq = counter.seq;
      const table = getTableForEntity(op.entity);
      const incomingData = JSON.parse(op.payload) as SyncableEntity;

      // 3. Fetch existing record
      const existingRecords = await tx.select().from(table).where(and(eq(table.id, op.entityId), eq(table.userId, userId)));
      
      if (existingRecords.length > 0) {
        const existingData = existingRecords[0] as unknown as SyncableEntity;
        // 4. Conflict resolution
        const winner = resolveConflict(existingData, incomingData);
        
        if (winner === incomingData) {
          // Incoming wins: update the record
          await tx.update(table)
            .set({ ...incomingData, serverSeq: newSeq })
            .where(eq(table.id, op.entityId));
        }
        // If existing wins, we do nothing to the table, but we still mark the op as processed
      } else {
        // 5. Insert new record
        await tx.insert(table).values({
          ...incomingData,
          userId,
          serverSeq: newSeq,
        });
      }

      // 6. Mark op as processed
      await tx.insert(schema.processedOps).values({ opId: op.opId, userId });
      acceptedOpIds.push(op.opId);
    }

    return acceptedOpIds;
  });
}

export async function pullSync(userId: string, since: number, limit: number = 500) {
  const changes: any[] = [];
  let maxSeq = since;

  const fetchTable = async (table: any, entityName: string) => {
    const rows = await db.select().from(table)
      .where(and(eq(table.userId, userId), gt(table.serverSeq, since)))
      .orderBy(table.serverSeq)
      .limit(limit);
    
    for (const row of rows) {
      changes.push({ entity: entityName, data: row });
      if (row.serverSeq > maxSeq) maxSeq = row.serverSeq;
    }
  };

  // We fetch from all tables. In a production app with massive data, we would optimize this.
  await Promise.all([
    fetchTable(schema.expenses, "Expense"),
    fetchTable(schema.categories, "Category"),
    fetchTable(schema.budgets, "Budget"),
    fetchTable(schema.recurringRules, "RecurringRule"),
  ]);

  // Sort combined changes by serverSeq to maintain strict ordering
  changes.sort((a, b) => a.data.serverSeq - b.data.serverSeq);
  
  const hasMore = changes.length > limit;
  const paginatedChanges = changes.slice(0, limit);

  // The new cursor is the max serverSeq in the returned page
  const newCursor = paginatedChanges.length > 0 
    ? paginatedChanges[paginatedChanges.length - 1].data.serverSeq 
    : since;

  return {
    changes: paginatedChanges,
    cursor: newCursor,
    hasMore,
  };
}