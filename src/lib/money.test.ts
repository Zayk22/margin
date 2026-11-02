import { describe, expect, it } from "vitest";
import { formatKobo, parseKobo } from "./money";

describe("money", () => {
  describe("parseKobo", () => {
    it("parses whole numbers", () => {
      expect(parseKobo("100")).toBe(10000);
      expect(parseKobo("0")).toBe(0);
    });

    it("parses decimals", () => {
      expect(parseKobo("100.5")).toBe(10050);
      expect(parseKobo("100.05")).toBe(10005);
      expect(parseKobo("0.10")).toBe(10);
      expect(parseKobo("0.20")).toBe(20);
    });

    it("handles the float addition trap", () => {
      // 0.1 + 0.2 = 0.30000000000000004 in standard JS floats
      const a = parseKobo("0.10");
      const b = parseKobo("0.20");
      expect(a + b).toBe(30); // 30 kobo, exactly
    });

    it("parses large values", () => {
      expect(parseKobo("1000000000.00")).toBe(100000000000);
    });

    it("rejects invalid formats", () => {
      expect(() => parseKobo("100.123")).toThrow();
      expect(() => parseKobo("abc")).toThrow();
      expect(() => parseKobo("1,000")).toThrow();
    });

    it("handles negative numbers (for edge cases)", () => {
      expect(parseKobo("-50.50")).toBe(-5050);
    });
  });

  describe("formatKobo", () => {
    it("formats whole kobo to Naira", () => {
      // Intl uses non-breaking spaces which can be tricky in tests, so we strip them
      const format = (k: number) => formatKobo(k).replace(/\u00a0/g, " ");
      
      expect(format(10000)).toBe("₦100.00");
      expect(format(10050)).toBe("₦100.50");
      expect(format(5)).toBe("₦0.05");
      expect(format(0)).toBe("₦0.00");
    });
  });
});