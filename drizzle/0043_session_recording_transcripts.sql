CREATE TYPE "public"."transcription_status" AS ENUM('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "session_recording_transcripts" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"recording_id" varchar(255) NOT NULL,
	"status" "transcription_status" DEFAULT 'QUEUED' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_message" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"model" varchar(100),
	"variant" varchar(50),
	"chunk_seconds" integer,
	"segments" jsonb,
	"warnings" jsonb
);
--> statement-breakpoint
ALTER TABLE "session_recording_transcripts" ADD CONSTRAINT "session_recording_transcripts_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "public"."session_recordings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "session_recording_transcripts_recording_id_key" ON "session_recording_transcripts" USING btree ("recording_id");--> statement-breakpoint
CREATE INDEX "session_recording_transcripts_status_started_at_idx" ON "session_recording_transcripts" USING btree ("status","started_at");