CREATE TYPE "public"."survey_upload_status" AS ENUM('PENDING', 'UPLOADED', 'QUEUED', 'PROCESSING', 'PROCESSED', 'FAILED');--> statement-breakpoint
CREATE TABLE "survey_uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"hub_id" varchar(255) NOT NULL,
	"uploaded_by" varchar(255) NOT NULL,
	"s3_key" text NOT NULL,
	"file_name" text NOT NULL,
	"sha256" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"page_count" integer,
	"status" "survey_upload_status" DEFAULT 'PENDING' NOT NULL,
	"error" text,
	"uploaded_at" timestamp with time zone,
	CONSTRAINT "survey_uploads_sha256_check" CHECK ("survey_uploads"."sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "survey_uploads_byte_size_check" CHECK ("survey_uploads"."byte_size" > 0),
	CONSTRAINT "survey_uploads_uploaded_check" CHECK ("survey_uploads"."status" = 'PENDING' or "survey_uploads"."uploaded_at" is not null),
	CONSTRAINT "survey_uploads_error_check" CHECK (("survey_uploads"."status" = 'FAILED') = ("survey_uploads"."error" is not null))
);
--> statement-breakpoint
ALTER TABLE "survey_uploads" ADD CONSTRAINT "survey_uploads_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "survey_uploads" ADD CONSTRAINT "survey_uploads_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE UNIQUE INDEX "survey_uploads_sha256_key" ON "survey_uploads" USING btree ("sha256");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_uploads_s3_key_key" ON "survey_uploads" USING btree ("s3_key");--> statement-breakpoint
CREATE INDEX "survey_uploads_hub_id_uploaded_at_idx" ON "survey_uploads" USING btree ("hub_id","uploaded_at");--> statement-breakpoint
CREATE INDEX "survey_uploads_uploaded_by_idx" ON "survey_uploads" USING btree ("uploaded_by");