-- Recreated instead of ADD VALUE: drizzle-kit migrates in one transaction, and the next migration uses the new values.
SET LOCAL lock_timeout = '5s';--> statement-breakpoint
ALTER TABLE "admin_users" ALTER COLUMN "team" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."admin_team";--> statement-breakpoint
CREATE TYPE "public"."admin_team" AS ENUM('CARE', 'RESEARCH', 'OPERATIONS', 'TECH');--> statement-breakpoint
ALTER TABLE "admin_users" ALTER COLUMN "team" SET DATA TYPE "public"."admin_team" USING "team"::"public"."admin_team";
