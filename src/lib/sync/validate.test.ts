import { describe, it, expect } from "vitest";
import { validateOp, clampUpdatedAt } from "./validate";
import { OutboxOp } from "../types";

const NOW_MS = 1700000000000;

const makeOp = (overrides: Partial<Omit<OutboxOp, "payload">> & { payload: any }): OutboxOp => {
  const { payload, ...rest } = overrides;
  return {
    opId: "op-1",
    entity: "Expense",
    entityId: "exp-1",
    type: "upsert",
    createdAt: new Date(NOW_MS).toISOString(),
    attempts: 0,
    ...rest,
    payload: typeof payload === "string" ? payload : JSON.stringify(payload),
  };
};

const validExpense = {
  id: "exp-1",
  amountKobo: 1000,
  categoryId: "cat-1",
  note: "Lunch",
  occurredOn: "2024-05-15",
  createdAt: new Date(NOW_MS - 1000).toISOString(),
  updatedAt: new Date(NOW_MS).toISOString(),
  deletedAt: null,
  deviceId: "device-1",
};

describe("validateOp", () => {
  it("accepts a valid Expense op", () => {
    const op = makeOp({ payload: validExpense });
    const res = validateOp(op, NOW_MS);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.amountKobo).toBe(1000);
      expect(res.data.userId).toBeUndefined();
    }
  });

  it("rejects an unknown entity", () => {
    const op = makeOp({ entity: "Unknown" as any, payload: validExpense });
    expect(validateOp(op, NOW_MS).ok).toBe(false);
  });

  it("rejects non-JSON payload", () => {
    const op = makeOp({ payload: "bad-json" });
    expect(validateOp(op, NOW_MS).ok).toBe(false);
  });

  it("rejects id mismatch", () => {
    const op = makeOp({ entityId: "different", payload: validExpense });
    expect(validateOp(op, NOW_MS).ok).toBe(false);
  });

  it("strips userId, serverSeq, and unknown fields", () => {
    const op = makeOp({ payload: { ...validExpense, userId: "hacker", serverSeq: 99, extra: "bad" } });
    const res = validateOp(op, NOW_MS);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.userId).toBeUndefined();
      expect(res.data.serverSeq).toBeUndefined();
      expect(res.data.extra).toBeUndefined();
    }
  });

  it("rejects invalid amounts", () => {
    const base = { ...validExpense };
    expect(validateOp(makeOp({ payload: { ...base, amountKobo: 0 } }), NOW_MS).ok).toBe(false);
    expect(validateOp(makeOp({ payload: { ...base, amountKobo: -100 } }), NOW_MS).ok).toBe(false);
    expect(validateOp(makeOp({ payload: { ...base, amountKobo: 1.5 } }), NOW_MS).ok).toBe(false);
    expect(validateOp(makeOp({ payload: { ...base, amountKobo: "100" } }), NOW_MS).ok).toBe(false);
    expect(validateOp(makeOp({ payload: { ...base, amountKobo: 9_000_000_000_000_001 } }), NOW_MS).ok).toBe(false);
    expect(validateOp(makeOp({ payload: { ...base, amountKobo: 9_000_000_000_000_000 } }), NOW_MS).ok).toBe(true);
  });

  it("rejects impossible dates", () => {
    expect(validateOp(makeOp({ payload: { ...validExpense, occurredOn: "2026-02-30" } }), NOW_MS).ok).toBe(false);
    expect(validateOp(makeOp({ payload: { ...validExpense, occurredOn: "2027-02-29" } }), NOW_MS).ok).toBe(false);
    expect(validateOp(makeOp({ payload: { ...validExpense, occurredOn: "2028-02-29" } }), NOW_MS).ok).toBe(true);
  });

  it("clamps times more than 5 minutes ahead", () => {
    const future = new Date(NOW_MS + 6 * 60 * 1000).toISOString();
    const clamped = clampUpdatedAt(future, NOW_MS);
    expect(clamped).toBe(new Date(NOW_MS + 5 * 60 * 1000).toISOString());
  });

  it("does not clamp times within 5 minutes", () => {
    const exact = new Date(NOW_MS + 5 * 60 * 1000).toISOString();
    expect(clampUpdatedAt(exact, NOW_MS)).toBe(exact);
  });
});