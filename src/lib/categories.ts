import { Category } from "./types";

/**
 * Hardcoded UUIDs for default categories so client and server agree.
 * Icons and colorTokens are used by CategoryChip to render the UI.
 */
export const DEFAULT_CATEGORIES: Omit<Category, "createdAt" | "updatedAt" | "deletedAt" | "deviceId">[] = [
  { id: "11111111-1111-4111-a111-111111111111", name: "Transport", icon: "bus", colorToken: "cat-1", isDefault: true },
  { id: "22222222-2222-4222-a222-222222222222", name: "Food", icon: "utensils", colorToken: "cat-2", isDefault: true },
  { id: "33333333-3333-4333-a333-333333333333", name: "Airtime and data", icon: "smartphone", colorToken: "cat-3", isDefault: true },
  { id: "44444444-4444-4444-a444-444444444444", name: "Rent", icon: "home", colorToken: "cat-4", isDefault: true },
  { id: "55555555-5555-4555-a555-555555555555", name: "Bills", icon: "file-text", colorToken: "cat-5", isDefault: true },
  { id: "66666666-6666-4666-a666-666666666666", name: "Health", icon: "heart", colorToken: "cat-6", isDefault: true },
  { id: "77777777-7777-4777-a777-777777777777", name: "Shopping", icon: "shopping-bag", colorToken: "cat-7", isDefault: true },
  { id: "88888888-8888-4888-a888-888888888888", name: "Savings", icon: "piggy-bank", colorToken: "cat-8", isDefault: true },
  { id: "99999999-9999-4999-a999-999999999999", name: "Other", icon: "more-horizontal", colorToken: "cat-9", isDefault: true },
];