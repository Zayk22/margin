import { describe, expect, it } from "vitest";
import { resolveConflict, type SyncableEntity } from "./conflict";

const base: SyncableEntity = {
  updatedAt: "2024-05-15T10:00:00.000Z",
  deviceId: "device-a",
  deletedAt: null,
};

describe("resolveConflict", () => {
  it("newer update wins", () => {
    const older: SyncableEntity = { ...base, updatedAt: "2024-05-15T10:00:00.000Z" };
    const newer: SyncableEntity = { ...base, updatedAt: "2024-05-15T11:00:00.000Z" };
    
    expect(resolveConflict(older, newer)).toBe(newer);
    expect(resolveConflict(newer, older)).toBe(newer);
  });

  it("newer delete wins over older delete", () => {
    const older: SyncableEntity = { ...base, deletedAt: "2024-05-15T10:00:00.000Z", updatedAt: "2024-05-15T10:00:00.000Z" };
    const newer: SyncableEntity = { ...base, deletedAt: "2024-05-15T11:00:00.000Z", updatedAt: "2024-05-15T11:00:00.000Z" };
    
    expect(resolveConflict(older, newer)).toBe(newer);
  });

  it("newer update wins over older delete", () => {
    const update: SyncableEntity = { ...base, updatedAt: "2024-05-15T11:00:00.000Z", deletedAt: null };
    const del: SyncableEntity = { ...base, updatedAt: "2024-05-15T10:00:00.000Z", deletedAt: "2024-05-15T10:00:00.000Z" };
    
    expect(resolveConflict(update, del)).toBe(update);
  });

  it("newer delete wins over older update", () => {
    const update: SyncableEntity = { ...base, updatedAt: "2024-05-15T10:00:00.000Z", deletedAt: null };
    const del: SyncableEntity = { ...base, updatedAt: "2024-05-15T11:00:00.000Z", deletedAt: "2024-05-15T11:00:00.000Z" };
    
    expect(resolveConflict(update, del)).toBe(del);
  });

  it("tie on updatedAt: lexicographically larger deviceId wins", () => {
    const a: SyncableEntity = { ...base, deviceId: "device-a", updatedAt: "2024-05-15T10:00:00.000Z" };
    const b: SyncableEntity = { ...base, deviceId: "device-b", updatedAt: "2024-05-15T10:00:00.000Z" };
    
    expect(resolveConflict(a, b)).toBe(b);
    expect(resolveConflict(b, a)).toBe(b);
  });

  it("tie on updatedAt and deviceId: tombstone wins", () => {
    const live: SyncableEntity = { ...base, deviceId: "device-a", updatedAt: "2024-05-15T10:00:00.000Z", deletedAt: null };
    const tombstone: SyncableEntity = { ...base, deviceId: "device-a", updatedAt: "2024-05-15T10:00:00.000Z", deletedAt: "2024-05-15T10:00:00.000Z" };
    
    expect(resolveConflict(live, tombstone)).toBe(tombstone);
    expect(resolveConflict(tombstone, live)).toBe(tombstone);
  });

  it("returns either if all tuple values are identical", () => {
    const a: SyncableEntity = { ...base };
    const b: SyncableEntity = { ...base };
    
    expect(resolveConflict(a, b)).toBe(a);
  });
});