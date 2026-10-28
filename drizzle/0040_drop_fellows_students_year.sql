SET LOCAL lock_timeout = '5s';--> statement-breakpoint
ALTER TABLE "fellows" DROP COLUMN "year_of_implementation";--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN "year_of_implementation";