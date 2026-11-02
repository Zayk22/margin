import { getDb } from "../local/db";
import { resolveConflict } from "../lib/sync/conflict";
import { syncStatusStore } from "./status";
import { OutboxOp } from "../lib/types";

export type SyncConfig = {
  userId: string;
  getToken: () => Promise<string | null>;
};

let isSyncing = false;

/**
 * Pushes all pending outbox operations to the server.
 */
async function pushOutbox(db: ReturnType<typeof getDb>, config: SyncConfig): Promise<boolean> {
  const ops = await db.outbox.toArray();
  if (ops.length === 0) return true;

  const token = await config.getToken();
  if (!token) return false; // Expired session, we cannot sync

  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ops }),
    });

    if (!res.ok) {
      if (res.status === 401) return false; // Unauthorized
      throw new Error(`Push failed: ${res.status}`);
    }

    const { accepted } = (await res.json()) as { accepted: string[] };
    
    // Remove accepted ops from outbox
    await db.outbox.bulkDelete(accepted);
    return true;
  } catch (error) {
    console.error("Push error:", error);
    return false;
  }
}

/**
 * Pulls new changes from the server and applies them to Dexie.
 */
async function pullChanges(db: ReturnType<typeof getDb>, config: SyncConfig): Promise<boolean> {
  const token = await config.getToken();
  if (!token) return false;

  const meta = await db.syncMeta.get("cursor");
  const since = meta?.value ?? 0;

  try {
    const res = await fetch(`/api/sync?since=${since}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 401) return false;
      throw new Error(`Pull failed: ${res.status}`);
    }

    const { changes, cursor } = (await res.json()) as { changes: any[]; cursor: number };

    if (changes.length === 0) return true;

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
          // If we have a local copy, resolve the conflict
          const winner = resolveConflict(localData, remoteData);
          // Only put if the remote data won (or if they are identical, it overwrites with the same data)
          if (winner === remoteData) {
            await table.put(remoteData);
          }
        } else {
          // No local copy, just insert it
          await table.put(remoteData);
        }
      }

      // Update cursor
      await db.syncMeta.put({ key: "cursor", value: cursor });
    });

    return true;
  } catch (error) {
    console.error("Pull error:", error);
    return false;
  }
}

/**
 * The main sync loop with exponential backoff.
 */
export async function runSync(config: SyncConfig): Promise<void> {
  if (isSyncing) return;
  if (!navigator.onLine) {
    syncStatusStore.setStatus("Offline");
    return;
  }

  const db = getDb(config.userId);
  const pendingCount = await db.outbox.count();

  if (pendingCount === 0) {
    syncStatusStore.setStatus("Synced");
  } else {
    syncStatusStore.setStatus(`${pendingCount} changes waiting`);
  }

  isSyncing = true;
  syncStatusStore.setStatus("Syncing");

  let success = false;
  let attempt = 0;

  while (!success && attempt < 5) {
    const pushSuccess = await pushOutbox(db, config);
    const pullSuccess = await pullChanges(db, config);
    
    if (pushSuccess && pullSuccess) {
      success = true;
      break;
    }

    attempt++;
    if (attempt < 5) {
      // Exponential backoff with jitter: 2^attempt * 1000 + random(0-1000)
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  isSyncing = false;

  if (success) {
    const remaining = await db.outbox.count();
    syncStatusStore.setStatus(remaining === 0 ? "Synced" : `${remaining} changes waiting`);
  } else {
    syncStatusStore.setStatus("Offline"); // Treat failure as offline
  }
}