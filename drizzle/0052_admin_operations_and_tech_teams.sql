-- Adds the OPERATIONS and TECH admin teams. drizzle-kit migrate runs every pending migration in one
-- transaction, and Postgres refuses an enum value added by ALTER TYPE ... ADD VALUE until that
-- transaction commits, so the type is recreated for a later migration in the same run to use them.
SET LOCAL lock_timeout = '5s';--> statement-breakpoint
ALTER TABLE "admin_users" ALTER COLUMN "team" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."admin_team";--> statement-breakpoint
CREATE TYPE "public"."admin_team" AS ENUM('CARE', 'RESEARCH', 'OPERATIONS', 'TECH');--> statement-breakpoint
ALTER TABLE "admin_users" ALTER COLUMN "team" SET DATA TYPE "public"."admin_team" USING "team"::"public"."admin_team";
