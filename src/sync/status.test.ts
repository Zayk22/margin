import { describe, it, expect } from "vitest";
import { deriveStatus } from "./status";

describe("deriveStatus", () => {
  it("paused overrides everything", () => {
    expect(deriveStatus(5, true, true, true)).toBe("Sign in to sync");
    expect(deriveStatus(0, false, false, true)).toBe("Sign in to sync");
  });

  it("syncing overrides offline and pending", () => {
    expect(deriveStatus(5, true, true, false)).toBe("Syncing");
    expect(deriveStatus(0, true, false, false)).toBe("Syncing");
  });

  it("pending changes override offline", () => {
    expect(deriveStatus(1, false, true, false)).toBe("1 change waiting");
    expect(deriveStatus(3, false, true, false)).toBe("3 changes waiting");
    expect(deriveStatus(3, false, false, false)).toBe("3 changes waiting");
  });

  it("offline with 0 pending", () => {
    expect(deriveStatus(0, false, true, false)).toBe("Offline");
  });

  it("synced when nothing is pending", () => {
    expect(deriveStatus(0, false, false, false)).toBe("Synced");
  });
});