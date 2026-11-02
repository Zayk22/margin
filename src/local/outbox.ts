import { OutboxOp, UUID } from "../lib/types";
import { MarginDatabase } from "./db";

/**
 * Appends an operation to the outbox.
 * IMPORTANT: This must be called inside a Dexie transaction alongside the actual entity write.
 */
export async function appendToOutbox(
  db: MarginDatabase,
  entity: OutboxOp["entity"],
  entityId: UUID,
  type: OutboxOp["type"],
  payload: string
): Promise<void> {
  const op: OutboxOp = {
    opId: crypto.randomUUID(),
    entity,
    entityId,
    type,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  await db.outbox.add(op);
}