import { describe, expect, it, beforeEach } from "vitest";
import { MarginDatabase, getDb } from "./db";
import { seedDefaultCategories } from "./seed";
import { DEFAULT_CATEGORIES } from "../lib/categories";

const DEVICE_ID = "test-device-1";

describe("seedDefaultCategories", () => {
  let db: MarginDatabase;

  beforeEach(async () => {
    const dbName = "seed-test-" + crypto.randomUUID();
    db = getDb(dbName);
    await db.open();
  });

  it("seeds 9 default categories into a fresh database", async () => {
    await seedDefaultCategories(db, DEVICE_ID);
    const cats = await db.categories.toArray();
    expect(cats).toHaveLength(9);
    expect(cats.find((c) => c.name === "Health")).toBeDefined();
  });

  it("migrates old tokens, adds missing Health, and preserves metadata", async () => {
    const oldNow = "2024-01-01T00:00:00.000Z";
    const oldCats = DEFAULT_CATEGORIES.slice(0, 8).map((c) => ({
      ...c,
      colorToken: "blue",
      createdAt: oldNow,
      updatedAt: oldNow,
      deletedAt: null,
      deviceId: "old-device",
    }));
    await db.categories.bulkPut(oldCats);

    await seedDefaultCategories(db, DEVICE_ID);

    const cats = await db.categories.toArray();
    expect(cats).toHaveLength(9);
    expect(cats.find((c) => c.name === "Health")).toBeDefined();
    expect(cats.find((c) => c.id === "11111111-1111-4111-a111-111111111111")?.colorToken).toBe("cat-1");
    expect(cats.find((c) => c.id === "11111111-1111-4111-a111-111111111111")?.deviceId).toBe("old-device");
  });

  it("is idempotent and does not duplicate", async () => {
    await seedDefaultCategories(db, DEVICE_ID);
    await seedDefaultCategories(db, DEVICE_ID);
    const cats = await db.categories.toArray();
    expect(cats).toHaveLength(9);
  });

  it("does not touch custom categories", async () => {
    const custom = {
      id: "custom-1", name: "Custom", icon: "more-horizontal", colorToken: "cat-9",
      isDefault: false, createdAt: "123", updatedAt: "123", deletedAt: null, deviceId: "x"
    };
    await db.categories.put(custom);
    await seedDefaultCategories(db, DEVICE_ID);
    const cats = await db.categories.toArray();
    expect(cats).toHaveLength(10);
    expect(cats.find((c) => c.id === "custom-1")).toEqual(custom);
  });

  it("does not write to outbox", async () => {
    await seedDefaultCategories(db, DEVICE_ID);
    const ops = await db.outbox.toArray();
    expect(ops).toHaveLength(0);
  });

  it("handles concurrent calls without throwing", async () => {
    await Promise.all([
      seedDefaultCategories(db, DEVICE_ID),
      seedDefaultCategories(db, DEVICE_ID)
    ]);
    const cats = await db.categories.toArray();
    expect(cats).toHaveLength(9);
  });
});