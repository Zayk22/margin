export type SyncStatus = "Synced" | "Offline" | "Syncing" | "Sign in to sync" | `${number} changes waiting` | "1 change waiting";

export function deriveStatus(pendingCount: number, isSyncing: boolean, isOffline: boolean, isPaused: boolean): SyncStatus {
  if (isPaused) return "Sign in to sync";
  if (isSyncing) return "Syncing";
  
  if (pendingCount > 0) {
    return pendingCount === 1 ? "1 change waiting" : `${pendingCount} changes waiting`;
  }
  
  if (isOffline) return "Offline";
  return "Synced";
}

let currentStatus: SyncStatus = "Offline";
const listeners = new Set<() => void>();

export const syncStatusStore = {
  getStatus: () => currentStatus,
  setStatus: (status: SyncStatus) => {
    if (currentStatus !== status) {
      currentStatus = status;
      listeners.forEach((listener) => listener());
    }
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};