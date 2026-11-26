ALTER TABLE "survey_uploads" ADD COLUMN "notify_tries" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "survey_uploads" ADD COLUMN "notify_next_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "survey_uploads" ADD COLUMN "notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "survey_uploads" ADD COLUMN "notify_error" text;--> statement-breakpoint
ALTER TABLE "survey_uploads" ADD COLUMN "stuck_after" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "survey_uploads_status_notify_next_at_idx" ON "survey_uploads" USING btree ("status","notify_next_at");--> statement-breakpoint
ALTER TABLE "survey_uploads" ADD CONSTRAINT "survey_uploads_notify_tries_check" CHECK ("survey_uploads"."notify_tries" >= 0);