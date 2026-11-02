import { describe, expect, it } from "vitest";
import {
  getMonthBoundaries,
  getPreviousMonth,
  parseLocalDate,
  toLocalDateString,
  toLocalMonthString,
} from "./dates";

describe("dates", () => {
  describe("toLocalDateString / toLocalMonthString", () => {
    it("formats a Date to local YYYY-MM-DD", () => {
      const date = new Date(2024, 4, 15); // May 15, 2024
      expect(toLocalDateString(date)).toBe("2024-05-15");
    });

    it("formats a Date to local YYYY-MM", () => {
      const date = new Date(2024, 4, 15);
      expect(toLocalMonthString(date)).toBe("2024-05");
    });

    it("does not shift dates near midnight", () => {
      // A date at 11:30 PM local time should stay on the same day
      const date = new Date(2024, 4, 15, 23, 30);
      expect(toLocalDateString(date)).toBe("2024-05-15");
    });
  });

  describe("parseLocalDate", () => {
    it("parses a valid local date string to a Date object", () => {
      const date = parseLocalDate("2024-05-15");
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(4); // 0-indexed
      expect(date.getDate()).toBe(15);
    });

    it("throws on invalid formats", () => {
      expect(() => parseLocalDate("2024/05/15")).toThrow();
      expect(() => parseLocalDate("2024-05")).toThrow();
    });

    it("throws on invalid calendar dates", () => {
      expect(() => parseLocalDate("2024-02-30")).toThrow();
      expect(() => parseLocalDate("2023-02-29")).toThrow(); // 2023 is not a leap year
    });
  });

  describe("getMonthBoundaries", () => {
    it("returns the correct boundaries for a 31-day month", () => {
      expect(getMonthBoundaries("2024-01")).toEqual({
        start: "2024-01-01",
        end: "2024-01-31",
      });
    });

    it("returns the correct boundaries for a 30-day month", () => {
      expect(getMonthBoundaries("2024-04")).toEqual({
        start: "2024-04-01",
        end: "2024-04-30",
      });
    });

    it("returns the correct boundaries for February in a leap year", () => {
      expect(getMonthBoundaries("2024-02")).toEqual({
        start: "2024-02-01",
        end: "2024-02-29",
      });
    });

    it("returns the correct boundaries for February in a non-leap year", () => {
      expect(getMonthBoundaries("2023-02")).toEqual({
        start: "2023-02-01",
        end: "2023-02-28",
      });
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
});