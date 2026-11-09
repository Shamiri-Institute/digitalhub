CREATE TYPE "public"."survey_answer_review_status" AS ENUM('AUTO_ACCEPTED', 'NEEDS_REVIEW', 'VERIFIED', 'CORRECTED');--> statement-breakpoint
CREATE TYPE "public"."survey_answer_source" AS ENUM('PIPELINE', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."survey_field_kind" AS ENUM('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DIGITS', 'DATE', 'TEXT', 'SIGNATURE');--> statement-breakpoint
CREATE TYPE "public"."survey_scan_page_status" AS ENUM('MATCHED', 'UNIDENTIFIED', 'DUPLICATE', 'REJECTED');--> statement-breakpoint
CREATE TABLE "survey_answers" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"questionnaire_id" text NOT NULL,
	"version_id" text NOT NULL,
	"field" text NOT NULL,
	"scan_page_id" text,
	"recognized_value" jsonb,
	"confidence" real,
	"crop_s3_key" text,
	"value" jsonb,
	"source" "survey_answer_source" NOT NULL,
	"review_status" "survey_answer_review_status" NOT NULL,
	"flags" text[] DEFAULT '{}'::text[] NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	CONSTRAINT "survey_answers_confidence_check" CHECK ("survey_answers"."confidence" IS NULL OR "survey_answers"."confidence" BETWEEN 0 AND 1),
	CONSTRAINT "survey_answers_pipeline_check" CHECK ("survey_answers"."source" <> 'PIPELINE' OR ("survey_answers"."scan_page_id" IS NOT NULL AND "survey_answers"."confidence" IS NOT NULL)),
	CONSTRAINT "survey_answers_manual_check" CHECK ("survey_answers"."source" <> 'MANUAL' OR ("survey_answers"."recognized_value" IS NULL AND "survey_answers"."confidence" IS NULL AND "survey_answers"."review_status" IN ('VERIFIED', 'CORRECTED'))),
	CONSTRAINT "survey_answers_reviewed_check" CHECK (("survey_answers"."review_status" IN ('VERIFIED', 'CORRECTED')) = ("survey_answers"."reviewed_by" IS NOT NULL) AND ("survey_answers"."reviewed_by" IS NULL) = ("survey_answers"."reviewed_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "survey_scan_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"upload_id" text NOT NULL,
	"page_index" integer NOT NULL,
	"image_s3_key" text NOT NULL,
	"questionnaire_page_id" text,
	"status" "survey_scan_page_status" NOT NULL,
	"duplicate_of_id" text,
	CONSTRAINT "survey_scan_pages_id_questionnaire_page_id_key" UNIQUE("id","questionnaire_page_id"),
	CONSTRAINT "survey_scan_pages_page_index_check" CHECK ("survey_scan_pages"."page_index" >= 0),
	CONSTRAINT "survey_scan_pages_duplicate_check" CHECK (("survey_scan_pages"."status" = 'DUPLICATE') = ("survey_scan_pages"."duplicate_of_id" IS NOT NULL)),
	CONSTRAINT "survey_scan_pages_identified_check" CHECK (CASE "survey_scan_pages"."status"
        WHEN 'UNIDENTIFIED' THEN "survey_scan_pages"."questionnaire_page_id" IS NULL
        WHEN 'REJECTED' THEN TRUE
        ELSE "survey_scan_pages"."questionnaire_page_id" IS NOT NULL
      END)
);
--> statement-breakpoint
CREATE TABLE "survey_version_fields" (
	"version_id" text NOT NULL,
	"field" text NOT NULL,
	"page_number" integer NOT NULL,
	"kind" "survey_field_kind" NOT NULL,
	CONSTRAINT "survey_version_fields_pkey" PRIMARY KEY("version_id","field"),
	CONSTRAINT "survey_version_fields_page_number_check" CHECK ("survey_version_fields"."page_number" >= 1)
);
--> statement-breakpoint
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_questionnaire_id_version_id_fkey" FOREIGN KEY ("questionnaire_id","version_id") REFERENCES "public"."survey_questionnaires"("id","version_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_version_id_field_fkey" FOREIGN KEY ("version_id","field") REFERENCES "public"."survey_version_fields"("version_id","field") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_scan_page_id_fkey" FOREIGN KEY ("scan_page_id") REFERENCES "public"."survey_scan_pages"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "survey_scan_pages" ADD CONSTRAINT "survey_scan_pages_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "public"."survey_uploads"("id") ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "survey_scan_pages" ADD CONSTRAINT "survey_scan_pages_questionnaire_page_id_fkey" FOREIGN KEY ("questionnaire_page_id") REFERENCES "public"."survey_questionnaire_pages"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "survey_scan_pages" ADD CONSTRAINT "survey_scan_pages_duplicate_of_id_fkey" FOREIGN KEY ("duplicate_of_id","questionnaire_page_id") REFERENCES "public"."survey_scan_pages"("id","questionnaire_page_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "survey_version_fields" ADD CONSTRAINT "survey_version_fields_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "public"."survey_versions"("id") ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
CREATE UNIQUE INDEX "survey_answers_questionnaire_id_version_id_field_key" ON "survey_answers" USING btree ("questionnaire_id","version_id","field");--> statement-breakpoint
CREATE INDEX "survey_answers_version_id_field_idx" ON "survey_answers" USING btree ("version_id","field");--> statement-breakpoint
CREATE INDEX "survey_answers_scan_page_id_idx" ON "survey_answers" USING btree ("scan_page_id");--> statement-breakpoint
CREATE INDEX "survey_answers_reviewed_by_idx" ON "survey_answers" USING btree ("reviewed_by");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_scan_pages_upload_id_page_index_key" ON "survey_scan_pages" USING btree ("upload_id","page_index");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_scan_pages_one_match_per_page_key" ON "survey_scan_pages" USING btree ("questionnaire_page_id") WHERE "survey_scan_pages"."status" = 'MATCHED';--> statement-breakpoint
CREATE INDEX "survey_scan_pages_questionnaire_page_id_idx" ON "survey_scan_pages" USING btree ("questionnaire_page_id");--> statement-breakpoint
CREATE INDEX "survey_scan_pages_duplicate_of_id_questionnaire_page_id_idx" ON "survey_scan_pages" USING btree ("duplicate_of_id","questionnaire_page_id");