import { OutboxOp } from "../types";

export type ValidationResult = 
  | { ok: true; entity: OutboxOp["entity"]; entityId: string; type: OutboxOp["type"]; data: any }
  | { ok: false; reason: string };

const MAX_KOBO = 9_000_000_000_000_000; // Fits safely in JS safe integer and bigint
const MAX_STR_LEN = 255;
const MAX_NOTE_LEN = 1000;

const ENTITY_FIELDS: Record<OutboxOp["entity"], string[]> = {
  Expense: ["id", "amountKobo", "categoryId", "note", "occurredOn", "createdAt", "updatedAt", "deletedAt", "deviceId"],
  Category: ["id", "name", "icon", "colorToken", "isDefault", "createdAt", "updatedAt", "deletedAt", "deviceId"],
  Budget: ["id", "categoryId", "month", "amountKobo", "createdAt", "updatedAt", "deletedAt", "deviceId"],
  RecurringRule: ["id", "categoryId", "amountKobo", "note", "frequency", "startOn", "endOn", "lastGeneratedOn", "createdAt", "updatedAt", "deletedAt", "deviceId"],
};

function isValidDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (m < 1 || m > 12) return false;
  const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (d < 1 || d > daysInMonth[m - 1]) return false;
  return true;
}

function isValidMonth(monthStr: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(monthStr)) return false;
  const m = Number(monthStr.split("-")[1]);
  return m >= 1 && m <= 12;
}

function isValidISO(str: string): boolean {
  try {
    return !isNaN(new Date(str).getTime()) && str.length >= 20;
  } catch {
    return false;
  }
}

export function clampUpdatedAt(updatedAt: string, nowMs: number): string {
  const updatedMs = new Date(updatedAt).getTime();
  const fiveMinsMs = 5 * 60 * 1000;
  if (updatedMs > nowMs + fiveMinsMs) {
    return new Date(nowMs + fiveMinsMs).toISOString();
  }
  return updatedAt;
}

export function validateOp(op: OutboxOp, nowMs: number): ValidationResult {
  if (!["Expense", "Category", "Budget", "RecurringRule"].includes(op.entity)) {
    return { ok: false, reason: "Invalid entity" };
  }
  if (!["upsert", "delete"].includes(op.type)) {
    return { ok: false, reason: "Invalid type" };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(op.payload);
  } catch {
    return { ok: false, reason: "Payload is not valid JSON" };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, reason: "Payload is not a plain object" };
  }

  if (parsed.id !== op.entityId || typeof op.entityId !== "string" || op.entityId.length === 0 || op.entityId.length > 64) {
    return { ok: false, reason: "ID mismatch or invalid length" };
  }

  if (typeof parsed.deviceId !== "string" || parsed.deviceId.length === 0 || parsed.deviceId.length > 64) {
    return { ok: false, reason: "Invalid deviceId" };
  }

  if (op.type === "delete" && !parsed.deletedAt) {
    return { ok: false, reason: "Delete op missing deletedAt" };
  }

  if (parsed.deletedAt && !isValidISO(parsed.deletedAt)) {
    return { ok: false, reason: "Invalid deletedAt ISO string" };
  }

  // Per-entity validation
  if (op.entity === "Expense" || op.entity === "Budget" || op.entity === "RecurringRule") {
    if (typeof parsed.amountKobo !== "number" || !Number.isInteger(parsed.amountKobo) || parsed.amountKobo <= 0 || parsed.amountKobo > MAX_KOBO) {
      return { ok: false, reason: "Invalid amountKobo" };
    }
  }

  if (op.entity === "Expense") {
    if (!isValidDate(parsed.occurredOn)) return { ok: false, reason: "Invalid occurredOn date" };
  }

  if (op.entity === "Budget") {
    if (!isValidMonth(parsed.month)) return { ok: false, reason: "Invalid month" };
  }

  if (op.entity === "RecurringRule") {
    if (!isValidDate(parsed.startOn)) return { ok: false, reason: "Invalid startOn date" };
    if (parsed.endOn !== null && !isValidDate(parsed.endOn)) return { ok: false, reason: "Invalid endOn date" };
    if (parsed.lastGeneratedOn !== null && !isValidDate(parsed.lastGeneratedOn)) return { ok: false, reason: "Invalid lastGeneratedOn date" };
    if (!["weekly", "monthly"].includes(parsed.frequency)) return { ok: false, reason: "Invalid frequency" };
  }

  if (parsed.note && (typeof parsed.note !== "string" || parsed.note.length > MAX_NOTE_LEN)) {
    return { ok: false, reason: "Note too long or invalid" };
  }
  if (parsed.name && (typeof parsed.name !== "string" || parsed.name.length > MAX_STR_LEN)) {
    return { ok: false, reason: "Name too long or invalid" };
  }

  if (!isValidISO(parsed.createdAt)) return { ok: false, reason: "Invalid createdAt" };
  if (!isValidISO(parsed.updatedAt)) return { ok: false, reason: "Invalid updatedAt" };

  // Apply skew clamp
  const clampedUpdatedAt = clampUpdatedAt(parsed.updatedAt, nowMs);

  // Strip unknown fields and build safe data object
  const whitelist = ENTITY_FIELDS[op.entity];
  const data: Record<string, any> = {};
  for (const key of whitelist) {
    if (key === "updatedAt") {
      data[key] = clampedUpdatedAt;
    } else {
      data[key] = parsed[key];
    }
  }

  return { ok: true, entity: op.entity, entityId: op.entityId, type: op.type, data };
}