ALTER TABLE "budgets" ALTER COLUMN "amount_kobo" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "amount_kobo" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "recurring_rules" ALTER COLUMN "amount_kobo" SET DATA TYPE bigint;