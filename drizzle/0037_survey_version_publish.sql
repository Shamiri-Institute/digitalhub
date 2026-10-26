CREATE TYPE "public"."survey_version_prefill" AS ENUM('NONE', 'SCHOOL', 'STUDENT');--> statement-breakpoint
ALTER TABLE "survey_versions" ADD COLUMN "prefill" "survey_version_prefill";--> statement-breakpoint
ALTER TABLE "survey_versions" ADD COLUMN "layout" jsonb;--> statement-breakpoint
ALTER TABLE "survey_versions" ADD COLUMN "layout_engine_version" integer;--> statement-breakpoint
ALTER TABLE "survey_versions" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "survey_versions" ADD COLUMN "published_by" varchar(255);--> statement-breakpoint
ALTER TABLE "survey_versions" ADD CONSTRAINT "survey_versions_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX "survey_versions_published_by_idx" ON "survey_versions" USING btree ("published_by");--> statement-breakpoint
ALTER TABLE "survey_versions" ADD CONSTRAINT "survey_versions_publish_check" CHECK (("survey_versions"."layout" IS NULL) = ("survey_versions"."prefill" IS NULL) AND ("survey_versions"."layout" IS NULL) = ("survey_versions"."layout_engine_version" IS NULL) AND ("survey_versions"."layout" IS NULL) = ("survey_versions"."published_at" IS NULL) AND ("survey_versions"."layout" IS NULL) = ("survey_versions"."published_by" IS NULL) AND ("survey_versions"."layout" IS NULL OR ("survey_versions"."status" <> 'DRAFT' AND "survey_versions"."layout"->>'prefill' = "survey_versions"."prefill"::text)));