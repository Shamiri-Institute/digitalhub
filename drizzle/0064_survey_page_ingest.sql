SET LOCAL lock_timeout = '5s';--> statement-breakpoint
CREATE TYPE "public"."survey_answer_read_status" AS ENUM('OK', 'UNCERTAIN', 'BLANK', 'NO_PREDICTION');--> statement-breakpoint
CREATE TYPE "public"."survey_scan_rejection" AS ENUM('UNREADABLE', 'UNKNOWN_CODE', 'CODES_DISAGREE', 'VOID_COPY', 'OTHER_HUB', 'VERIFIED_COPY');--> statement-breakpoint
CREATE TABLE "survey_field_kind_reviews" (
	"kind" "survey_field_kind" PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "survey_answers" DROP CONSTRAINT "survey_answers_pipeline_check";--> statement-breakpoint
ALTER TABLE "survey_answers" DROP CONSTRAINT "survey_answers_manual_check";--> statement-breakpoint
ALTER TABLE "survey_scan_pages" DROP CONSTRAINT "survey_scan_pages_identified_check";--> statement-breakpoint
ALTER TABLE "survey_scan_pages" ALTER COLUMN "image_s3_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "survey_answers" ADD COLUMN "read_status" "survey_answer_read_status";--> statement-breakpoint
ALTER TABLE "survey_answers" ADD COLUMN "read_detail" jsonb;--> statement-breakpoint
ALTER TABLE "survey_scan_pages" ADD COLUMN "attempt" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "survey_scan_pages" ADD COLUMN "aligned" boolean;--> statement-breakpoint
ALTER TABLE "survey_scan_pages" ADD COLUMN "rejected_reason" "survey_scan_rejection";--> statement-breakpoint
ALTER TABLE "survey_scan_pages" ADD COLUMN "posted_result" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "survey_scan_pages" ADD COLUMN "posted_sha256" text NOT NULL;--> statement-breakpoint
ALTER TABLE "survey_uploads" ADD COLUMN "attempt" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "survey_answers" DROP COLUMN "crop_s3_key";--> statement-breakpoint
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_read_status_check" CHECK ("survey_answers"."read_status" IS NULL OR ("survey_answers"."read_status" = 'OK') = ("survey_answers"."recognized_value" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_read_detail_check" CHECK ("survey_answers"."read_detail" IS NULL OR jsonb_typeof("survey_answers"."read_detail") = 'object');--> statement-breakpoint
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_pipeline_check" CHECK ("survey_answers"."source" <> 'PIPELINE' OR ("survey_answers"."scan_page_id" IS NOT NULL AND "survey_answers"."read_status" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_manual_check" CHECK ("survey_answers"."source" <> 'MANUAL' OR ("survey_answers"."recognized_value" IS NULL AND "survey_answers"."confidence" IS NULL AND "survey_answers"."read_status" IS NULL AND "survey_answers"."read_detail" IS NULL AND "survey_answers"."review_status" IN ('VERIFIED', 'CORRECTED')));--> statement-breakpoint
ALTER TABLE "survey_scan_pages" ADD CONSTRAINT "survey_scan_pages_attempt_check" CHECK ("survey_scan_pages"."attempt" >= 1);--> statement-breakpoint
ALTER TABLE "survey_scan_pages" ADD CONSTRAINT "survey_scan_pages_posted_sha256_check" CHECK ("survey_scan_pages"."posted_sha256" ~ '^[0-9a-f]{64}$');--> statement-breakpoint
ALTER TABLE "survey_scan_pages" ADD CONSTRAINT "survey_scan_pages_posted_result_check" CHECK (jsonb_typeof("survey_scan_pages"."posted_result") = 'object');--> statement-breakpoint
ALTER TABLE "survey_scan_pages" ADD CONSTRAINT "survey_scan_pages_rejected_check" CHECK (("survey_scan_pages"."status" = 'REJECTED') = ("survey_scan_pages"."rejected_reason" IS NOT NULL)
        AND ("survey_scan_pages"."rejected_reason" IS NOT DISTINCT FROM 'UNREADABLE') = ("survey_scan_pages"."image_s3_key" IS NULL)
        AND ("survey_scan_pages"."image_s3_key" IS NULL) = ("survey_scan_pages"."aligned" IS NULL));--> statement-breakpoint
ALTER TABLE "survey_scan_pages" ADD CONSTRAINT "survey_scan_pages_identified_check" CHECK (CASE "survey_scan_pages"."status"
        WHEN 'UNIDENTIFIED' THEN "survey_scan_pages"."questionnaire_page_id" IS NULL
        WHEN 'REJECTED' THEN ("survey_scan_pages"."rejected_reason" IN ('VOID_COPY', 'OTHER_HUB', 'VERIFIED_COPY')) = ("survey_scan_pages"."questionnaire_page_id" IS NOT NULL)
        ELSE "survey_scan_pages"."questionnaire_page_id" IS NOT NULL
      END);--> statement-breakpoint
ALTER TABLE "survey_uploads" ADD CONSTRAINT "survey_uploads_attempt_check" CHECK ("survey_uploads"."attempt" >= 1);