import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveTheme, readThemeChoice } from "./theme";

describe("Theme", () => {
  describe("resolveTheme", () => {
    it("returns dark when choice is dark and prefers dark", () => {
      expect(resolveTheme("dark", true)).toBe("dark");
    });
    it("returns dark when choice is dark and prefers light", () => {
      expect(resolveTheme("dark", false)).toBe("dark");
    });
    it("returns light when choice is light and prefers dark", () => {
      expect(resolveTheme("light", true)).toBe("light");
    });
    it("returns light when choice is light and prefers light", () => {
      expect(resolveTheme("light", false)).toBe("light");
    });
    it("returns dark when choice is system and prefers dark", () => {
      expect(resolveTheme("system", true)).toBe("dark");
    });
    it("returns light when choice is system and prefers light", () => {
      expect(resolveTheme("system", false)).toBe("light");
    });
  });

  describe("readThemeChoice", () => {
    beforeEach(() => {
      vi.stubGlobal("localStorage", {
        getItem: vi.fn(),
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("returns the stored dark choice", () => {
      vi.mocked(localStorage.getItem).mockReturnValue("dark");
      expect(readThemeChoice()).toBe("dark");
    });

    it("returns the stored light choice", () => {
      vi.mocked(localStorage.getItem).mockReturnValue("light");
      expect(readThemeChoice()).toBe("light");
    });

    it("returns system for an invalid stored value", () => {
      vi.mocked(localStorage.getItem).mockReturnValue("invalid-value");
      expect(readThemeChoice()).toBe("system");
    });

    it("returns system if nothing is stored", () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);
      expect(readThemeChoice()).toBe("system");
    });

    it("returns system if localStorage throws", () => {
      vi.mocked(localStorage.getItem).mockImplementation(() => {
        throw new Error("Access denied");
      });
      expect(readThemeChoice()).toBe("system");
    });
  });
});