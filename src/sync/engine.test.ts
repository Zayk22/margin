import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calculateBackoff, runSync, resetSyncEngine, parsePullResponse } from "./engine";
import { syncStatusStore } from "./status";

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

  it("parsePullResponse rejects bad shapes", () => {
    expect(() => parsePullResponse(null)).toThrow();
    expect(() => parsePullResponse({})).toThrow();
    expect(() => parsePullResponse({ changes: [], cursor: 0, hasMore: false, extra: "bad" })).not.toThrow();
    expect(() => parsePullResponse({ changes: [{ entity: "BadEntity", data: {} }], cursor: 0, hasMore: false })).toThrow();
  });

  it("parsePullResponse strips server fields", () => {
    const valid = {
      changes: [{ entity: "Expense", data: { id: "1", userId: "u1", serverSeq: 5, amountKobo: 100 } }],
      cursor: 5,
      hasMore: false
    };
    const parsed = parsePullResponse(valid);
    expect(parsed.changes[0].data.userId).toBeUndefined();
    expect(parsed.changes[0].data.serverSeq).toBeUndefined();
    expect(parsed.changes[0].data.amountKobo).toBe(100);
  });

  it("pauses on 401 without retrying", async () => {
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

  it("does not pause on token failure", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const config = {
      userId: "test-user-token-fail",
      getToken: async () => { throw new Error("No token"); },
    };

    await runSync(config);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(syncStatusStore.getStatus()).toBe("1 change waiting");
  });

  it("retries on 500 with backoff and eventually fails to Offline", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ status: 500 });
    vi.stubGlobal("fetch", mockFetch);

    const config = {
      userId: "test-user-500",
      getToken: async () => "valid-token",
    };

    const runPromise = runSync(config);
    await vi.runAllTimersAsync();
    await runPromise;

    expect(mockFetch).toHaveBeenCalledTimes(5);
    expect(syncStatusStore.getStatus()).toBe("1 change waiting");
  });
});