CREATE TYPE "public"."transcription_status" AS ENUM('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "transcriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"recording_id" varchar(255) NOT NULL,
	"status" "transcription_status" DEFAULT 'QUEUED' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_message" text,
	"model" text,
	"prompt_version" text,
	"prompt_sha256" text,
	"audio_seconds" real,
	"chunk_count" integer,
	"segments" jsonb,
	"gaps" jsonb,
	CONSTRAINT "transcriptions_attempts_check" CHECK ("transcriptions"."attempts" >= 0),
	CONSTRAINT "transcriptions_processing_check" CHECK ("transcriptions"."status" <> 'PROCESSING' OR "transcriptions"."started_at" IS NOT NULL),
	CONSTRAINT "transcriptions_completed_check" CHECK ("transcriptions"."status" <> 'COMPLETED' OR ("transcriptions"."segments" IS NOT NULL AND "transcriptions"."gaps" IS NOT NULL AND "transcriptions"."completed_at" IS NOT NULL AND "transcriptions"."model" IS NOT NULL AND "transcriptions"."prompt_version" IS NOT NULL AND "transcriptions"."prompt_sha256" IS NOT NULL AND "transcriptions"."audio_seconds" > 0)),
	CONSTRAINT "transcriptions_failed_check" CHECK ("transcriptions"."status" <> 'FAILED' OR "transcriptions"."error_message" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "transcriptions" ADD CONSTRAINT "transcriptions_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "public"."session_recordings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "transcriptions_recording_id_created_at_idx" ON "transcriptions" USING btree ("recording_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "transcriptions_one_active_per_recording_key" ON "transcriptions" USING btree ("recording_id") WHERE "transcriptions"."status" IN ('QUEUED', 'PROCESSING');