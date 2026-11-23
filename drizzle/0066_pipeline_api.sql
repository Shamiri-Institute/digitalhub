CREATE TABLE "survey_scan_page_images" (
	"upload_id" text NOT NULL,
	"attempt" integer NOT NULL,
	"page_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"byte_size" integer NOT NULL,
	"sha256" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	CONSTRAINT "survey_scan_page_images_upload_id_attempt_page_index_sha256_pk" PRIMARY KEY("upload_id","attempt","page_index","sha256"),
	CONSTRAINT "survey_scan_page_images_attempt_check" CHECK ("survey_scan_page_images"."attempt" >= 1),
	CONSTRAINT "survey_scan_page_images_page_index_check" CHECK ("survey_scan_page_images"."page_index" >= 0),
	CONSTRAINT "survey_scan_page_images_byte_size_check" CHECK ("survey_scan_page_images"."byte_size" > 0),
	CONSTRAINT "survey_scan_page_images_sha256_check" CHECK ("survey_scan_page_images"."sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "survey_scan_page_images_size_check" CHECK ("survey_scan_page_images"."width" > 0 AND "survey_scan_page_images"."height" > 0)
);
--> statement-breakpoint
ALTER TABLE "survey_uploads" ADD COLUMN "last_heartbeat_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "survey_scan_page_images" ADD CONSTRAINT "survey_scan_page_images_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "public"."survey_uploads"("id") ON DELETE cascade ON UPDATE restrict;