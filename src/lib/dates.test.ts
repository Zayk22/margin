import { describe, expect, it } from "vitest";
import {
  getMonthBoundaries,
  getPreviousMonth,
  parseLocalDate,
  toLocalDateString,
  toLocalMonthString,
  formatNextDate,
} from "./dates";
import { generateMissedOccurrences } from "./recurring";
import { RecurringRule } from "./types";

describe("dates", () => {
  describe("toLocalDateString / toLocalMonthString", () => {
    it("formats a Date to local YYYY-MM-DD", () => {
      const date = new Date(2024, 4, 15);
      expect(toLocalDateString(date)).toBe("2024-05-15");
    });
    it("formats a Date to local YYYY-MM", () => {
      const date = new Date(2024, 4, 15);
      expect(toLocalMonthString(date)).toBe("2024-05");
    });
    it("does not shift dates near midnight", () => {
      const date = new Date(2024, 4, 15, 23, 30);
      expect(toLocalDateString(date)).toBe("2024-05-15");
    });
  });

  describe("parseLocalDate", () => {
    it("parses a valid local date string to a Date object", () => {
      const date = parseLocalDate("2024-05-15");
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(4);
      expect(date.getDate()).toBe(15);
    });
    it("throws on invalid formats", () => {
      expect(() => parseLocalDate("2024/05/15")).toThrow();
      expect(() => parseLocalDate("2024-05")).toThrow();
    });
    it("throws on invalid calendar dates", () => {
      expect(() => parseLocalDate("2024-02-30")).toThrow();
      expect(() => parseLocalDate("2023-02-29")).toThrow();
    });
  });

  describe("getMonthBoundaries", () => {
    it("returns the correct boundaries for a 31-day month", () => {
      expect(getMonthBoundaries("2024-01")).toEqual({ start: "2024-01-01", end: "2024-01-31" });
    });
    it("returns the correct boundaries for a 30-day month", () => {
      expect(getMonthBoundaries("2024-04")).toEqual({ start: "2024-04-01", end: "2024-04-30" });
    });
    it("returns the correct boundaries for February in a leap year", () => {
      expect(getMonthBoundaries("2024-02")).toEqual({ start: "2024-02-01", end: "2024-02-29" });
    });
    it("returns the correct boundaries for February in a non-leap year", () => {
      expect(getMonthBoundaries("2023-02")).toEqual({ start: "2023-02-01", end: "2023-02-28" });
    });
  });

  describe("getPreviousMonth", () => {
    it("returns the previous month in the same year", () => {
      expect(getPreviousMonth("2024-05")).toBe("2024-04");
    });
    it("handles the year boundary correctly", () => {
      expect(getPreviousMonth("2024-01")).toBe("2023-12");
    });
  });

  describe("formatNextDate", () => {
    const today = "2026-11-06";
    it("returns Today if the date is today", () => {
      expect(formatNextDate("2026-11-06", today)).toBe("Today");
    });
    it("returns Due if the date is in the past", () => {
      expect(formatNextDate("2026-11-01", today)).toContain("Due");
    });
    it("returns Next if the date is in the future", () => {
      expect(formatNextDate("2026-11-13", today)).toContain("Next:");
    });
    it("handles year boundaries", () => {
      expect(formatNextDate("2027-01-01", today)).toContain("Next:");
    });
  });
});

describe("Recurring generation advances next date", () => {
  it("advances a monthly rule past today", () => {
    const rule: RecurringRule = {
      id: "1", categoryId: "c", amountKobo: 100, note: "",
      frequency: "monthly", startOn: "2026-11-01", endOn: null,
      lastGeneratedOn: null, createdAt: "", updatedAt: "", deletedAt: null, deviceId: "d"
    };
    const generated = generateMissedOccurrences(rule, "2026-11-06", "d");
    expect(generated).toHaveLength(1);
    expect(generated[0].occurredOn).toBe("2026-11-01");
    
    const updatedRule = { ...rule, lastGeneratedOn: "2026-11-01" };
    const nextDate = formatNextDate("2026-12-01", "2026-11-06");
    expect(nextDate).toContain("Next:");
  });

  it("advances a weekly rule past today", () => {
    const rule: RecurringRule = {
      id: "1", categoryId: "c", amountKobo: 100, note: "",
      frequency: "weekly", startOn: "2026-11-06", endOn: null,
      lastGeneratedOn: null, createdAt: "", updatedAt: "", deletedAt: null, deviceId: "d"
    };
    const generated = generateMissedOccurrences(rule, "2026-11-06", "d");
    expect(generated).toHaveLength(1);
    expect(generated[0].occurredOn).toBe("2026-11-06");
    
    const nextDate = formatNextDate("2026-11-13", "2026-11-06");
    expect(nextDate).toContain("Next:");
  });
});