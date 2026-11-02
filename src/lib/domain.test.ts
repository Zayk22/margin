import { describe, expect, it } from "vitest";
import { getBudgetState } from "./budget";
import { escapeCsvField } from "./csv";

describe("Budget thresholds", () => {
  it("returns calm when under 80%", () => {
    expect(getBudgetState(0, 10000)).toBe("calm");
    expect(getBudgetState(7999, 10000)).toBe("calm");
  });

  it("returns near when 80% to 100%", () => {
    expect(getBudgetState(8000, 10000)).toBe("near");
    expect(getBudgetState(10000, 10000)).toBe("near");
  });

  it("returns over when above 100%", () => {
    expect(getBudgetState(10001, 10000)).toBe("over");
  });

  it("handles zero budget gracefully", () => {
    expect(getBudgetState(0, 0)).toBe("calm");
    expect(getBudgetState(100, 0)).toBe("over");
  });
});

describe("CSV Escaping", () => {
  it("handles basic strings", () => {
    expect(escapeCsvField("hello")).toBe("hello");
    expect(escapeCsvField(123)).toBe("123");
    expect(escapeCsvField(null)).toBe("");
  });

  it("escapes commas", () => {
    expect(escapeCsvField("hello, world")).toBe('"hello, world"');
  });

  it("escapes quotes and doubles them", () => {
    expect(escapeCsvField('He said "hello"')).toBe('"He said ""hello"""');
  });

  it("escapes newlines", () => {
    expect(escapeCsvField("hello\nworld")).toBe('"hello\nworld"');
    expect(escapeCsvField("hello\r\nworld")).toBe('"hello\r\nworld"');
  });

  it("prevents formula injection", () => {
    expect(escapeCsvField("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)");
    expect(escapeCsvField("+123")).toBe("'+123");
    expect(escapeCsvField("-123")).toBe("'-123");
    expect(escapeCsvField("@SUM")).toBe("'@SUM");
  });

  it("prevents formula injection inside quotes", () => {
    expect(escapeCsvField("=1,2")).toBe('"\'=1,2"');
  });
});