export type SyncableEntity = {
  updatedAt: string;
  deviceId: string;
  deletedAt: string | null;
};

/**
 * Resolves a conflict between two versions of the same entity.
 * Compares (updatedAt, deviceId, isDeleted) lexicographically.
 * Returns the winning entity.
 */
export function resolveConflict<T extends SyncableEntity>(
  a: T,
  b: T,
): T {
  // 1. Compare updatedAt (ISO 8601 strings sort chronologically)
  if (a.updatedAt !== b.updatedAt) {
    return a.updatedAt > b.updatedAt ? a : b;
  }

  // 2. Tie-break by deviceId
  if (a.deviceId !== b.deviceId) {
    return a.deviceId > b.deviceId ? a : b;
  }

  // 3. Tie-break by isDeleted (tombstone wins)
  const aIsDeleted = a.deletedAt !== null;
  const bIsDeleted = b.deletedAt !== null;

  if (aIsDeleted !== bIsDeleted) {
    return aIsDeleted ? a : b;
  }

  // If everything is identical, return either (they are the same)
  return a;
}