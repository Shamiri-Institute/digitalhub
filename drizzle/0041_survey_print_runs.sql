CREATE TYPE "public"."survey_print_run_status" AS ENUM('QUEUED', 'RENDERING', 'READY', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."survey_questionnaire_status" AS ENUM('ISSUED', 'PARTIAL', 'NEEDS_REVIEW', 'READY', 'VERIFIED', 'VOID');--> statement-breakpoint
CREATE TABLE "survey_print_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"version_id" text NOT NULL,
	"hub_id" varchar(255) NOT NULL,
	"requested_by" varchar(255) NOT NULL,
	"copy_count" integer NOT NULL,
	"first_serial_number" integer NOT NULL,
	"request_digest" text NOT NULL,
	"status" "survey_print_run_status" DEFAULT 'QUEUED' NOT NULL,
	CONSTRAINT "survey_print_runs_copy_count_check" CHECK ("survey_print_runs"."copy_count" >= 1),
	CONSTRAINT "survey_print_runs_first_serial_number_check" CHECK ("survey_print_runs"."first_serial_number" >= 1)
);
--> statement-breakpoint
CREATE TABLE "survey_questionnaires" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"survey_id" text NOT NULL,
	"version_id" text NOT NULL,
	"print_run_id" text NOT NULL,
	"serial" varchar(32) NOT NULL,
	"serial_number" integer NOT NULL,
	"hub_id" varchar(255) NOT NULL,
	"school_id" varchar(255) NOT NULL,
	"student_id" varchar(255),
	"status" "survey_questionnaire_status" DEFAULT 'ISSUED' NOT NULL,
	CONSTRAINT "survey_questionnaires_serial_check" CHECK ("survey_questionnaires"."serial" ~ '^[A-Z][A-Z0-9]{1,9}-[0-9]{6,}$'),
	CONSTRAINT "survey_questionnaires_serial_number_check" CHECK ("survey_questionnaires"."serial_number" >= 1),
	CONSTRAINT "survey_questionnaires_serial_matches_number_check" CHECK ("survey_questionnaires"."serial" ~ ('-0*' || "survey_questionnaires"."serial_number" || '$'))
);
--> statement-breakpoint
CREATE TABLE "survey_questionnaire_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"questionnaire_id" text NOT NULL,
	"page_number" integer NOT NULL,
	"code" varchar(40) NOT NULL,
	CONSTRAINT "survey_questionnaire_pages_page_number_check" CHECK ("survey_questionnaire_pages"."page_number" >= 1),
	CONSTRAINT "survey_questionnaire_pages_code_check" CHECK ("survey_questionnaire_pages"."code" ~ ('-P' || "survey_questionnaire_pages"."page_number" || '$'))
);
--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "next_serial" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "survey_print_runs_id_version_id_hub_id_key" ON "survey_print_runs" USING btree ("id","version_id","hub_id");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_versions_id_survey_id_key" ON "survey_versions" USING btree ("id","survey_id");--> statement-breakpoint
ALTER TABLE "survey_print_runs" ADD CONSTRAINT "survey_print_runs_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "public"."survey_versions"("id") ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "survey_print_runs" ADD CONSTRAINT "survey_print_runs_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "survey_print_runs" ADD CONSTRAINT "survey_print_runs_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "survey_questionnaires" ADD CONSTRAINT "survey_questionnaires_print_run_id_version_id_hub_id_fkey" FOREIGN KEY ("print_run_id","version_id","hub_id") REFERENCES "public"."survey_print_runs"("id","version_id","hub_id") ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "survey_questionnaires" ADD CONSTRAINT "survey_questionnaires_version_id_survey_id_fkey" FOREIGN KEY ("version_id","survey_id") REFERENCES "public"."survey_versions"("id","survey_id") ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "survey_questionnaires" ADD CONSTRAINT "survey_questionnaires_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "survey_questionnaires" ADD CONSTRAINT "survey_questionnaires_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "survey_questionnaire_pages" ADD CONSTRAINT "survey_questionnaire_pages_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."survey_questionnaires"("id") ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX "survey_print_runs_version_id_idx" ON "survey_print_runs" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "survey_print_runs_hub_id_created_at_idx" ON "survey_print_runs" USING btree ("hub_id","created_at");--> statement-breakpoint
CREATE INDEX "survey_print_runs_requested_by_idx" ON "survey_print_runs" USING btree ("requested_by");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_questionnaires_survey_id_serial_key" ON "survey_questionnaires" USING btree ("survey_id","serial");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_questionnaires_survey_id_serial_number_key" ON "survey_questionnaires" USING btree ("survey_id","serial_number");--> statement-breakpoint
CREATE INDEX "survey_questionnaires_print_run_id_serial_number_idx" ON "survey_questionnaires" USING btree ("print_run_id","serial_number");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_questionnaires_id_version_id_key" ON "survey_questionnaires" USING btree ("id","version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_questionnaires_print_run_id_student_id_key" ON "survey_questionnaires" USING btree ("print_run_id","student_id") WHERE "survey_questionnaires"."student_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "survey_questionnaires_print_run_id_version_id_hub_id_idx" ON "survey_questionnaires" USING btree ("print_run_id","version_id","hub_id");--> statement-breakpoint
CREATE INDEX "survey_questionnaires_version_id_survey_id_idx" ON "survey_questionnaires" USING btree ("version_id","survey_id");--> statement-breakpoint
CREATE INDEX "survey_questionnaires_school_id_idx" ON "survey_questionnaires" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "survey_questionnaires_student_id_idx" ON "survey_questionnaires" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_questionnaire_pages_questionnaire_id_page_number_key" ON "survey_questionnaire_pages" USING btree ("questionnaire_id","page_number");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_questionnaire_pages_code_key" ON "survey_questionnaire_pages" USING btree ("code");--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_next_serial_check" CHECK ("surveys"."next_serial" >= 1);