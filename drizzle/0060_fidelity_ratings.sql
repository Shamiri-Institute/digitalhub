CREATE TYPE "public"."fidelity_rating_status" AS ENUM('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "fidelity_ratings" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"recording_id" varchar(255) NOT NULL,
	"transcription_id" text NOT NULL,
	"status" "fidelity_rating_status" DEFAULT 'QUEUED' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_message" text,
	"model" text,
	"prompt_version" text,
	"prompt_sha256" text,
	CONSTRAINT "fidelity_ratings_attempts_check" CHECK ("fidelity_ratings"."attempts" >= 0),
	CONSTRAINT "fidelity_ratings_processing_check" CHECK ("fidelity_ratings"."status" <> 'PROCESSING' OR "fidelity_ratings"."started_at" IS NOT NULL),
	CONSTRAINT "fidelity_ratings_completed_check" CHECK ("fidelity_ratings"."status" <> 'COMPLETED' OR ("fidelity_ratings"."completed_at" IS NOT NULL AND "fidelity_ratings"."model" IS NOT NULL AND "fidelity_ratings"."prompt_version" IS NOT NULL AND "fidelity_ratings"."prompt_sha256" IS NOT NULL)),
	CONSTRAINT "fidelity_ratings_failed_check" CHECK ("fidelity_ratings"."status" <> 'FAILED' OR "fidelity_ratings"."error_message" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "fidelity_ratings" ADD CONSTRAINT "fidelity_ratings_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "public"."session_recordings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "fidelity_ratings" ADD CONSTRAINT "fidelity_ratings_transcription_id_fkey" FOREIGN KEY ("transcription_id") REFERENCES "public"."transcriptions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "fidelity_ratings_recording_id_created_at_idx" ON "fidelity_ratings" USING btree ("recording_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "fidelity_ratings_transcription_id_idx" ON "fidelity_ratings" USING btree ("transcription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fidelity_ratings_one_active_per_recording_key" ON "fidelity_ratings" USING btree ("recording_id") WHERE "fidelity_ratings"."status" IN ('QUEUED', 'PROCESSING');