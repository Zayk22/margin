import { MarginDatabase } from "./db";
import { DEFAULT_CATEGORIES } from "../lib/categories";

export async function seedDefaultCategories(db: MarginDatabase, deviceId: string): Promise<void> {
  try {
    await db.transaction("rw", db.categories, async () => {
      const existingCats = await db.categories.toArray();
      const existingMap = new Map(existingCats.map((c) => [c.id, c]));
      const now = new Date().toISOString();

      for (const def of DEFAULT_CATEGORIES) {
        const existing = existingMap.get(def.id);
        if (existing) {
          await db.categories.put({
            ...existing,
            name: def.name,
            icon: def.icon,
            colorToken: def.colorToken,
            isDefault: true,
          });
        } else {
          await db.categories.put({
            ...def,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
            deviceId,
          });
        }
      }
    });
  } catch (err) {
    console.error("Failed to seed default categories", err);
  }
}