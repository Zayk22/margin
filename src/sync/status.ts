export type SyncStatus = "Synced" | "Offline" | "Syncing" | "Sign in to sync" | `${number} changes waiting`;

export function deriveStatus(pendingCount: number, isSyncing: boolean, isOffline: boolean, isPaused: boolean): SyncStatus {
  if (isPaused) return "Sign in to sync";
  if (isOffline) return "Offline";
  if (isSyncing) return "Syncing";
  if (pendingCount > 0) return `${pendingCount} changes waiting`;
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