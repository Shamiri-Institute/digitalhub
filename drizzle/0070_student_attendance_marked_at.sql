ALTER TABLE "student_attendances" ADD COLUMN "marked_at" timestamp (3) DEFAULT (now() at time zone 'utc') NOT NULL;--> statement-breakpoint
UPDATE "student_attendances" SET "marked_at" = "updated_at";
