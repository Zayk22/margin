import { getDb } from "../local/db";
import { resolveConflict } from "../lib/sync/conflict";
import { syncStatusStore, deriveStatus } from "./status";

export type SyncConfig = {
  userId: string;
  getToken: () => Promise<string | null>;
};

let isSyncing = false;
let isPaused = false;

// Test helper to reset module-level state between tests
export function resetSyncEngine() {
  isSyncing = false;
  isPaused = false;
}

export function calculateBackoff(attempt: number, random: () => number = Math.random): number {
  const base = Math.pow(2, attempt) * 1000;
  const jitter = random() * 1000;
  return Math.min(base + jitter, 30000);
}

async function pushOutbox(db: ReturnType<typeof getDb>, token: string): Promise<void> {
  const ops = await db.outbox.toArray();
  if (ops.length === 0) return;

  const res = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

async function pullChanges(db: ReturnType<typeof getDb>, token: string): Promise<void> {
  const meta = await db.syncMeta.get("cursor");
  const since = meta?.value ?? 0;

  const res = await fetch(`/api/sync?since=${since}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    const err = new Error("Unauthorized") as any;
    err.status = 401;
    throw err;
  }
  if (!res.ok) throw new Error(`Pull failed: ${res.status}`);

  const { changes, cursor } = (await res.json()) as { changes: { entity: string; data: any }[]; cursor: number };

  if (changes.length === 0) {
    await db.syncMeta.put({ key: "cursor", value: cursor });
    return;
  }

  await db.transaction("rw", db.expenses, db.categories, db.budgets, db.recurringRules, db.syncMeta, async () => {
    for (const change of changes) {
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
    await db.syncMeta.put({ key: "cursor", value: cursor });
  });
}

export async function runSync(config: SyncConfig): Promise<void> {
  if (isSyncing || isPaused) return;

  let token: string | null = null;
  try {
    token = await config.getToken();
  } catch (e) {
    isPaused = true;
    syncStatusStore.setStatus(deriveStatus(0, false, false, true));
    return;
  }

  if (!token) {
    isPaused = true;
    syncStatusStore.setStatus(deriveStatus(0, false, false, true));
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
        await pushOutbox(db, token);
        await pullChanges(db, token);
        
        const pending = await db.outbox.count();
        syncStatusStore.setStatus(deriveStatus(pending, false, false, false));
        isPaused = false;
        return;
      } catch (error: any) {
        if (error.status === 401) {
          isPaused = true;
          syncStatusStore.setStatus(deriveStatus(0, false, false, true));
          return;
        }
        
        attempt++;
        if (attempt >= maxAttempts) {
          syncStatusStore.setStatus(deriveStatus(0, false, true, false));
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
  isPaused = false;
}