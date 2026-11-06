import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getDeviceId, resetDeviceId } from "./device";

describe("deviceId", () => {
  beforeEach(() => {
    resetDeviceId();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("generates and stores a new id on first call", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    const id = getDeviceId();
    expect(id).toBeTruthy();
    expect(localStorage.setItem).toHaveBeenCalledWith("margin-device-id", id);
  });

  it("returns the cached id on subsequent calls", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    const id1 = getDeviceId();
    const id2 = getDeviceId();
    expect(id1).toBe(id2);
    expect(localStorage.getItem).toHaveBeenCalledTimes(1);
  });

  it("returns the stored id if it exists", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("existing-id");
    expect(getDeviceId()).toBe("existing-id");
  });

  it("handles storage access errors gracefully", () => {
    vi.mocked(localStorage.getItem).mockImplementation(() => { throw new Error("Blocked"); });
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error("Blocked"); });
    
    const id = getDeviceId();
    expect(id).toBeTruthy();
  });

  it("clears the cache and storage on reset", () => {
    getDeviceId();
    resetDeviceId();
    expect(localStorage.removeItem).toHaveBeenCalledWith("margin-device-id");
    
    // Next call should generate a new one
    const newId = getDeviceId();
    expect(localStorage.setItem).toHaveBeenCalledWith("margin-device-id", newId);
  });
});