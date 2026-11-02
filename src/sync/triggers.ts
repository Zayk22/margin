import { runSync, SyncConfig } from "./engine";

let syncTimeout: NodeJS.Timeout | null = null;

/**
 * Debounced sync trigger for after local writes.
 */
export function triggerDebouncedSync(config: SyncConfig, delayMs = 2000): void {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    runSync(config);
  }, delayMs);
}

/**
 * Initializes all the event listeners for sync.
 * Call this once on app mount.
 */
export function initializeSyncTriggers(config: SyncConfig): () => void {
  const onOnline = () => runSync(config);
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      runSync(config);
    }
  };

  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisibilityChange);

  // Initial sync on startup
  runSync(config);

  return () => {
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    if (syncTimeout) clearTimeout(syncTimeout);
  };
}