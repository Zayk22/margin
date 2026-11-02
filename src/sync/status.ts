export type SyncStatus = "Synced" | "Offline" | "Syncing" | `${number} changes waiting`;

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