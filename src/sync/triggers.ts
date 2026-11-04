import { runSync, SyncConfig, resumeSync } from "./engine";

let syncTimeout: NodeJS.Timeout | null = null;

export function triggerDebouncedSync(config: SyncConfig, delayMs = 2000): void {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    resumeSync();
    runSync(config);
  }, delayMs);
}

export function initializeSyncTriggers(config: SyncConfig): () => void {
  const onOnline = () => {
    resumeSync();
    runSync(config);
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      resumeSync();
      runSync(config);
    }
  };

  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisibilityChange);

  resumeSync();
  runSync(config);

  return () => {
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    if (syncTimeout) clearTimeout(syncTimeout);
  };
}