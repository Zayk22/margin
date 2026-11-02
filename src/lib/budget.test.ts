import { describe, expect, it } from "vitest";
import { getBudgetState } from "./budget";

describe("getBudgetState", () => {
  it("returns calm when under 80%", () => {
    expect(getBudgetState(0, 10000)).toBe("calm");
    expect(getBudgetState(7999, 10000)).toBe("calm"); // 79.99%
  });

  it("returns near when 80% to 100%", () => {
    expect(getBudgetState(8000, 10000)).toBe("near"); // Exactly 80%
    expect(getBudgetState(9000, 10000)).toBe("near");
    expect(getBudgetState(10000, 10000)).toBe("near"); // Exactly 100%
  });

  it("returns over when above 100%", () => {
    expect(getBudgetState(10001, 10000)).toBe("over"); // 100.01%
    expect(getBudgetState(20000, 10000)).toBe("over");
  });

  it("handles zero budget gracefully", () => {
    expect(getBudgetState(0, 0)).toBe("calm");
    expect(getBudgetState(100, 0)).toBe("over");
  });
});