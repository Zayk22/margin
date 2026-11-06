I have read and will strictly follow these permanent file generation rules from this point forward. I will also carry them over if we ever start a new chat.

### README.md

````markdown
# Margin

Offline-first expense tracking for Nigeria. Margin is built for people whose data runs out, whose networks drop, and who log most of their spending in cash. It works fully offline: every write is saved to the device first, and syncs quietly in the background when a connection returns.

## Why this exists

Most expense apps assume constant connectivity. When a network drops mid-entry, people stop logging. When a phone reboots and the cache clears, the entries vanish. Margin treats the device as the source of truth and the server as a backup, not the other way around.

## Design philosophy

Calm, precise, adult. Not a generic fintech template. No purple gradients, no glassmorphism, no stock hero sections, no decorative illustrations. Bricolage Grotesque and DM Sans, ink-and-paper colours, subtle borders instead of heavy shadows, and a single dominant action per screen.

The full token set, including dark and light themes, is in `src/app/globals.css` and verified for WCAG AA contrast in `src/lib/design/contrast.test.ts`. That test runs as part of `npm test` and fails on any regression.

## Stack

- **Next.js 16** (App Router, Turbopack) with TypeScript in strict mode
- **Tailwind CSS v4** with `@tailwindcss/turbopack`
- **Clerk** for authentication
- **Neon Postgres** with **Drizzle ORM** on the server
- **Dexie** (IndexedDB) on the client, with `fake-indexeddb` for tests
- **Vitest** for unit tests, **Playwright** for the end-to-end test
- Deployed on **Vercel**

## Architecture

### Offline-first

The UI only ever reads and writes the local Dexie database. The network is never on the critical path of a user action. Adding an expense completes in under 100ms whether the device is online or offline.

### The outbox pattern

Every local write runs inside a single Dexie transaction that does two things atomically:

1. Writes the entity to its table.
2. Appends an operation to the `outbox` table.

If the browser crashes mid-write, either both succeed or neither does. There is no state where the entity exists but the sync operation was lost, or vice versa.

The `outbox` is an append-only log until it syncs. See `src/local/repositories.ts` and `src/local/outbox.ts`.

### The sync engine

The engine (`src/sync/engine.ts`) is triggered by four events: app start, the browser `online` event, a debounced timer after local writes, and the `visibilitychange` event when the tab becomes visible. It also distrusts `navigator.onLine`: a failed fetch counts as offline regardless.

Each sync cycle:

1. Reads the outbox.
2. POSTs it to `/api/sync`.
3. Deletes both **accepted** and **rejected** ops from the outbox. Rejected ops are logged server-side but not retried, because retrying a bad payload will fail forever.
4. Pulls changes from `/api/sync?since=<cursor>`, applies them to Dexie with conflict resolution, and stores the new cursor.

Retries use exponential backoff with jitter, capped at 30 seconds. A 401 pauses sync for 60 seconds and shows "Sign in to sync" instead of retrying in a tight loop.

### Conflict resolution

Every synced entity carries `updatedAt` (ISO 8601, client-set), `deviceId` (persisted per install), and `deletedAt` (null or ISO 8601). Two versions of the same record converge on a single winner by comparing the tuple `(updatedAt, deviceId, isDeleted)` lexicographically.

- A newer update beats an older update.
- A newer update beats an older delete.
- A newer delete beats an older update.
- On a tie of `updatedAt` and `deviceId`, the tombstone wins.
- On a full tie, either version is returned because they are identical.

The function is pure and shared between client and server: `src/lib/sync/conflict.ts`.

### Server-side validation

Every outbox operation is validated on the server before it touches the database (`src/lib/sync/validate.ts`). The validator:

- Rejects unknown entities and operation types.
- Checks that `payload.id` matches `op.entityId`.
- Whitelists fields per entity. Unknown fields, including `userId` and `serverSeq`, are dropped. The server forces `userId` from the authenticated session so a client cannot overwrite another user's row.
- Requires `amountKobo` to be a safe positive integer below a cap.
- Validates real calendar dates, including leap days.
- Clamps `updatedAt` to at most 5 minutes ahead of server time, so a device with a wrong clock cannot win every conflict forever.

### Idempotency

Every operation carries a client-generated `opId`. The server stores processed op IDs in the `processed_ops` table. Retrying the same batch never duplicates or reapplies anything.

Server-side `serverSeq` is allocated per user inside the same transaction as the write, using an `INSERT ... ON CONFLICT DO UPDATE RETURNING` against a `sync_counters` row. This guarantees that the sequence number is monotonic, that there are no gaps, and that the pull cursor is always correct.

## Offline auth and its trade-offs

Clerk needs a network. Margin handles this in two ways:

1. **Per-user database names.** The local database is `margin-<userId>`. Not a shared database with a `userId` column, so a bug cannot leak one user's rows into another's view.
2. **Last validated user ID.** After a successful sign-in, `margin-last-user-id` is written to `localStorage`. On the next load, if Clerk cannot reach the network, the app reads this ID and opens the app shell with local data.

Trade-off, stated plainly: **someone holding an unlocked device can read the last signed-in user's local expenses without authenticating.** This is device-level security, not per-user security. The OS lock screen is the mitigation. A PIN gate is out of scope for v1.

Sync always requires a real Clerk token. Offline use of the shell does not start the engine.

## Data model

```text
Expense      { id, amountKobo, categoryId, note, occurredOn, createdAt, updatedAt, deletedAt, deviceId }
Category     { id, name, icon, colorToken, isDefault, createdAt, updatedAt, deletedAt, deviceId }
Budget       { id, categoryId, month, amountKobo, createdAt, updatedAt, deletedAt, deviceId }
RecurringRule{ id, categoryId, amountKobo, note, frequency, startOn, endOn, lastGeneratedOn, createdAt, updatedAt, deletedAt, deviceId }
OutboxOp     { opId, entity, entityId, type, payload, createdAt, attempts }
```

Money is stored as an **integer number of kobo** everywhere. Never a float. The formatter uses `Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" })`. Parsing keypad input splits on the decimal point and does integer math, so `0.10 + 0.20` never produces `0.30000000000000004`.

Calendar dates (`occurredOn`, `startOn`, `endOn`, `lastGeneratedOn`) are plain local dates in `YYYY-MM-DD`. Timestamps (`createdAt`, `updatedAt`, `deletedAt`) are UTC ISO 8601 strings.

## Recurring expenses

Recurring rules generate expenses deterministically. The generated expense ID is `uuidv5(ruleId + ":" + occurredOn, MARGIN_NAMESPACE)`, so two devices that generate the same occurrence converge on the same row. The generated expense's `updatedAt` is the occurrence date at 00:00 UTC, not "now", so a local edit or delete always wins over a later generation. This prevents the "resurrection" bug where a deleted expense comes back because another device regenerated it.

Generation runs once on app open, catches up every missed occurrence up to today, and advances `lastGeneratedOn` on the rule.

## Accessibility

- All interactive targets are at least 44x44 pixels.
- `:focus-visible` outline on every focusable element, using the text colour for maximum contrast.
- All amounts use `font-variant-numeric: tabular-nums`.
- The sync pill and every toast use `aria-live="polite"`.
- Dialogs use `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap, Escape to close, and focus restore.
- Contrast is verified programmatically in both themes.

## Testing

- **Unit tests (Vitest):** money parsing and formatting, date handling including leap years and month boundaries, conflict resolution, outbox idempotency, recurring generation, budget thresholds and percentages, CSV escaping including formula injection, server-side validation, theme logic, device ID persistence.
- **Contrast test:** computes WCAG ratios for every text/background and icon/tint pair in both themes and fails on any regression.
- **End-to-end (Playwright):** signs in with Clerk, goes offline, adds three expenses, verifies the sync pill shows waiting, comes back online, verifies the pill returns to "Synced" and the expenses are on the server.

Run everything:

```powershell
npm test
npx playwright test
```

For the exact current test count, run `npm test` and read the final line.

## Running locally

### Prerequisites

- Node.js 24 or newer
- A Clerk development instance
- A Neon Postgres database

### Setup

```powershell
git clone https://github.com/Zayk22/margin.git
cd margin
npm install
```

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
DATABASE_URL=postgresql://...
```

Push the database schema:

```powershell
npx drizzle-kit push
```

Start the dev server:

```powershell
npm run dev
```

Open http://localhost:3000.

### Testing the offline flow

1. Open the app and sign in.
2. In DevTools, open the Network tab and set the throttle to **Offline**.
3. Add an expense. The sync pill will say "1 change waiting".
4. Set the throttle back to **Online**. The pill will flip to "Syncing" and then "Synced".

## Deployment

The app is deployed on Vercel. Environment variables needed in the Vercel project:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`

Set the Node.js version in Vercel's project settings to match the `engines` field in `package.json`.

**Important:** Clerk **development** keys (`pk_test_...` / `sk_test_...`) will not authenticate correctly on a production domain. You must switch to a Clerk production instance with a custom domain before deploying for real users.

## Trade-offs and known limitations

- **Last-write-wins by client clock.** A device with a wrong clock can win conflicts. The 5-minute skew guard limits the damage but does not eliminate it. Server-side timestamps would fix this at the cost of breaking the "works offline, no network in the path" property.
- **Pull pagination fetches up to `limit + 1` rows per table independently** and paginates the combined result. For small datasets this is correct. For large datasets it is inefficient and would need a single change-log table instead.
- **No PIN gate.** Device-level security only.
- **No shared budgets, no bank connections, no AI categorisation, no income tracking, no push notifications.** These are out of scope for v1.
- **Recurring rule editing does not backfill.** If you edit a rule's amount, past generated expenses keep the original amount. Only future occurrences use the new value.

## Project structure

```text
src/app        routes, layouts, API routes
src/components shared UI: chips, sheets, dialogs, charts
src/lib        pure domain logic: money, dates, conflict, validate, recurring, csv
src/local      Dexie schema, repositories, outbox, seed, recurring engine
src/sync       client sync engine, status store, triggers
src/server     Drizzle schema, sync handlers
src/hooks      useActiveUser
tests          Playwright end-to-end tests
drizzle        generated migrations
```
````