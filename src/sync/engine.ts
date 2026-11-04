import { getDb } from "../local/db";
import { resolveConflict } from "../lib/sync/conflict";
import { syncStatusStore, deriveStatus } from "./status";
import { OutboxOp, Expense, Category, Budget, RecurringRule } from "../lib/types";

export type SyncConfig = {
  userId: string;
  getToken: () => Promise<string | null>;
};

type SyncableEntity = Expense | Category | Budget | RecurringRule;

let isSyncing = false;
let pauseUntil = 0;
let currentConfig: SyncConfig | null = null;

export function resetSyncEngine() {
  isSyncing = false;
  pauseUntil = 0;
  currentConfig = null;
}

export function calculateBackoff(attempt: number, random: () => number = Math.random): number {
  const base = Math.pow(2, attempt) * 1000;
  const jitter = random() * 1000;
  return Math.min(base + jitter, 30000);
}

export function parsePullResponse(json: any): { changes: { entity: string; data: any }[]; cursor: number; hasMore: boolean } {
  if (!json || typeof json !== "object") throw new Error("Invalid response");
  if (!Array.isArray(json.changes)) throw new Error("Missing changes array");
  if (typeof json.cursor !== "number") throw new Error("Missing cursor");
  if (typeof json.hasMore !== "boolean") throw new Error("Missing hasMore");

  const validEntities = ["Expense", "Category", "Budget", "RecurringRule"];
  for (const change of json.changes) {
    if (!change || typeof change !== "object") throw new Error("Invalid change object");
    if (!validEntities.includes(change.entity)) throw new Error(`Invalid entity: ${change.entity}`);
    if (!change.data || typeof change.data !== "object") throw new Error("Missing data");
    
    delete change.data.userId;
    delete change.data.serverSeq;
  }

  return json as { changes: { entity: string; data: any }[]; cursor: number; hasMore: boolean };
}

async function pushOutbox(db: ReturnType<typeof getDb>): Promise<void> {
  const ops = await db.outbox.toArray();
  if (ops.length === 0) return;

  const res = await fetch("/api/sync", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ops }),
  });

  if (res.status === 401) {
    const err = new Error("Unauthorized") as any;
    err.status = 401;
    throw err;
  }
  if (!res.ok) throw new Error(`Push failed: ${res.status}`);

  const { accepted } = (await res.json()) as { accepted: string[] };
  await db.outbox.bulkDelete(accepted);
}

async function pullChanges(db: ReturnType<typeof getDb>): Promise<void> {
  let hasMore = true;
  let pageCount = 0;
  const maxPages = 10;

  while (hasMore && pageCount < maxPages) {
    const meta = await db.syncMeta.get("cursor");
    const since = meta?.value ?? 0;

    const res = await fetch(`/api/sync?since=${since}`, {
      credentials: "same-origin",
    });

    if (res.status === 401) {
      const err = new Error("Unauthorized") as any;
      err.status = 401;
      throw err;
    }
    if (!res.ok) throw new Error(`Pull failed: ${res.status}`);

    const parsed = parsePullResponse(await res.json());
    hasMore = parsed.hasMore;
    pageCount++;

    if (parsed.changes.length === 0) {
      await db.syncMeta.put({ key: "cursor", value: parsed.cursor });
      return;
    }

    await db.transaction("rw", db.expenses, db.categories, db.budgets, db.recurringRules, db.syncMeta, async () => {
      for (const change of parsed.changes) {
        const remoteData = change.data;
        let table: any;
        if (change.entity === "Expense") table = db.expenses;
        else if (change.entity === "Category") table = db.categories;
        else if (change.entity === "Budget") table = db.budgets;
        else if (change.entity === "RecurringRule") table = db.recurringRules;
        else continue;

        const localData = await table.get(remoteData.id);
        if (localData) {
          const winner = resolveConflict(localData, remoteData);
          if (winner === remoteData) await table.put(remoteData);
        } else {
          await table.put(remoteData);
        }
      }
      await db.syncMeta.put({ key: "cursor", value: parsed.cursor });
    });
  }
}

export async function runSync(config: SyncConfig): Promise<void> {
  currentConfig = config;
  if (isSyncing || Date.now() < pauseUntil) return;

  let token: string | null = null;
  try {
    token = await config.getToken();
  } catch (e) {
    const db = getDb(config.userId);
    const pending = await db.outbox.count();
    syncStatusStore.setStatus(deriveStatus(pending, false, true, false));
    return;
  }

  if (!token) {
    const db = getDb(config.userId);
    const pending = await db.outbox.count();
    syncStatusStore.setStatus(deriveStatus(pending, false, true, false));
    return;
  }

  isSyncing = true;
  const db = getDb(config.userId);
  let attempt = 0;
  const maxAttempts = 5;

  try {
    while (attempt < maxAttempts) {
      syncStatusStore.setStatus("Syncing");
      try {
        await pushOutbox(db);
        await pullChanges(db);
        
        const pending = await db.outbox.count();
        syncStatusStore.setStatus(deriveStatus(pending, false, false, false));
        return;
      } catch (error: any) {
        if (error.status === 401) {
          pauseUntil = Date.now() + 60000;
          syncStatusStore.setStatus(deriveStatus(0, false, false, true));
          return;
        }
        
        attempt++;
        if (attempt >= maxAttempts) {
          const pending = await db.outbox.count();
          syncStatusStore.setStatus(deriveStatus(pending, false, true, false));
          return;
        }
        
        const delay = calculateBackoff(attempt);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  } finally {
    isSyncing = false;
  }
}

export function resumeSync() {
  pauseUntil = 0;
  if (currentConfig) {
    runSync(currentConfig);
  }
}