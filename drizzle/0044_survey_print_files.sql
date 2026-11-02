-- Print runs become plans: a run reserves its serials and plans one file per school part, and
-- the files issue the copies and render them. A run's status is read from its files.
SET LOCAL lock_timeout = '5s';--> statement-breakpoint
CREATE TYPE "public"."survey_print_status" AS ENUM('QUEUED', 'RENDERING', 'READY', 'FAILED');--> statement-breakpoint
CREATE TABLE "survey_print_files" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"print_run_id" text NOT NULL,
	"school_id" varchar(255) NOT NULL,
	"part_number" integer NOT NULL,
	"first_serial_number" integer NOT NULL,
	"copy_count" integer NOT NULL,
	"student_ids" varchar(255)[],
	"status" "survey_print_status" DEFAULT 'QUEUED' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"lease_token" text,
	"leased_until" timestamp with time zone,
	"issued_at" timestamp with time zone,
	"byte_size" integer,
	"rendered_at" timestamp with time zone,
	"error" text,
	CONSTRAINT "survey_print_files_copy_count_check" CHECK ("survey_print_files"."copy_count" between 1 and 1000),
	CONSTRAINT "survey_print_files_part_number_check" CHECK ("survey_print_files"."part_number" >= 1),
	CONSTRAINT "survey_print_files_first_serial_number_check" CHECK ("survey_print_files"."first_serial_number" >= 1),
	CONSTRAINT "survey_print_files_student_ids_check" CHECK ("survey_print_files"."student_ids" is null or cardinality("survey_print_files"."student_ids") = "survey_print_files"."copy_count"),
	CONSTRAINT "survey_print_files_attempts_check" CHECK ("survey_print_files"."attempts" >= 0),
	CONSTRAINT "survey_print_files_lease_check" CHECK (("survey_print_files"."status" = 'RENDERING') = ("survey_print_files"."lease_token" is not null and "survey_print_files"."leased_until" is not null)),
	CONSTRAINT "survey_print_files_ready_check" CHECK (("survey_print_files"."status" = 'READY') = ("survey_print_files"."byte_size" is not null and "survey_print_files"."rendered_at" is not null)),
	CONSTRAINT "survey_print_files_issued_check" CHECK ("survey_print_files"."status" <> 'READY' or "survey_print_files"."issued_at" is not null)
);
--> statement-breakpoint
ALTER TABLE "survey_print_files" ADD CONSTRAINT "survey_print_files_print_run_id_fkey" FOREIGN KEY ("print_run_id") REFERENCES "public"."survey_print_runs"("id") ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "survey_print_files" ADD CONSTRAINT "survey_print_files_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE UNIQUE INDEX "survey_print_files_print_run_id_first_serial_number_key" ON "survey_print_files" USING btree ("print_run_id","first_serial_number");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_print_files_print_run_id_school_id_part_number_key" ON "survey_print_files" USING btree ("print_run_id","school_id","part_number");--> statement-breakpoint
CREATE INDEX "survey_print_files_school_id_idx" ON "survey_print_files" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "survey_print_files_unfinished_idx" ON "survey_print_files" USING btree ("attempts","created_at","first_serial_number") WHERE "survey_print_files"."status" in ('QUEUED', 'RENDERING');--> statement-breakpoint
ALTER TABLE "survey_print_runs" DROP COLUMN "status";--> statement-breakpoint
DROP TYPE "public"."survey_print_run_status";
