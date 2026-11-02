import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calculateBackoff, runSync, resetSyncEngine } from "./engine";
import { syncStatusStore } from "./status";

// Mock the database so fake timers don't hang on Dexie
vi.mock("../local/db", () => {
  return {
    getDb: vi.fn().mockReturnValue({
      outbox: {
        toArray: vi.fn().mockResolvedValue([{ opId: "op-1" }]),
        count: vi.fn().mockResolvedValue(1),
        bulkDelete: vi.fn().mockResolvedValue(undefined),
      },
      syncMeta: {
        get: vi.fn().mockResolvedValue({ value: 0 }),
        put: vi.fn().mockResolvedValue(undefined),
      },
      transaction: vi.fn().mockImplementation((mode, tables, cb) => cb()),
      expenses: { get: vi.fn(), put: vi.fn() },
      categories: { get: vi.fn(), put: vi.fn() },
      budgets: { get: vi.fn(), put: vi.fn() },
      recurringRules: { get: vi.fn(), put: vi.fn() },
    }),
  };
});

describe("Sync Engine", () => {
  beforeEach(() => {
    resetSyncEngine();
    vi.useFakeTimers();
    syncStatusStore.setStatus("Offline");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("calculates exponential backoff with jitter", () => {
    const mockRandom = () => 0.5;
    expect(calculateBackoff(1, mockRandom)).toBe(2500);
    expect(calculateBackoff(2, mockRandom)).toBe(4500);
    expect(calculateBackoff(10, mockRandom)).toBe(30000);
  });

  it("pauses on 401 without retrying and sets status to Sign in to sync", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ status: 401 });
    vi.stubGlobal("fetch", mockFetch);

    const config = {
      userId: "test-user-401",
      getToken: async () => "invalid-token",
    };

    await runSync(config);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(syncStatusStore.getStatus()).toBe("Sign in to sync");
  });

  it("retries on 500 with backoff and eventually fails to Offline", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ status: 500 });
    vi.stubGlobal("fetch", mockFetch);

    const config = {
      userId: "test-user-500",
      getToken: async () => "valid-token",
    };

    const runPromise = runSync(config);
    
    // Advance timers to get through the backoff delays
    await vi.runAllTimersAsync();
    await runPromise;

    // Because pushOutbox fails on the first fetch, pullChanges is never reached.
    // It retries 5 times, so fetch is called 5 times.
    expect(mockFetch).toHaveBeenCalledTimes(5);
    expect(syncStatusStore.getStatus()).toBe("Offline");
  });
});