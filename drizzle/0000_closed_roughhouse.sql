CREATE TABLE "budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"category_id" text NOT NULL,
	"month" text NOT NULL,
	"amount_kobo" integer NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"deleted_at" text,
	"device_id" text NOT NULL,
	"server_seq" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"color_token" text NOT NULL,
	"is_default" boolean NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"deleted_at" text,
	"device_id" text NOT NULL,
	"server_seq" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount_kobo" integer NOT NULL,
	"category_id" text NOT NULL,
	"note" text NOT NULL,
	"occurred_on" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"deleted_at" text,
	"device_id" text NOT NULL,
	"server_seq" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processed_ops" (
	"op_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"category_id" text NOT NULL,
	"amount_kobo" integer NOT NULL,
	"note" text NOT NULL,
	"frequency" text NOT NULL,
	"start_on" text NOT NULL,
	"end_on" text,
	"last_generated_on" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"deleted_at" text,
	"device_id" text NOT NULL,
	"server_seq" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_counters" (
	"user_id" text PRIMARY KEY NOT NULL,
	"seq" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "budgets_user_seq_idx" ON "budgets" USING btree ("user_id","server_seq");--> statement-breakpoint
CREATE INDEX "categories_user_seq_idx" ON "categories" USING btree ("user_id","server_seq");--> statement-breakpoint
CREATE INDEX "expenses_user_seq_idx" ON "expenses" USING btree ("user_id","server_seq");--> statement-breakpoint
CREATE INDEX "processed_ops_user_idx" ON "processed_ops" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recurring_rules_user_seq_idx" ON "recurring_rules" USING btree ("user_id","server_seq");