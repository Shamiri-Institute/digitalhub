CREATE TYPE "public"."survey_audit_actor" AS ENUM('USER', 'PIPELINE', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."survey_status" AS ENUM('DRAFT', 'ACTIVE', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."survey_version_status" AS ENUM('DRAFT', 'PUBLISHED', 'RETIRED');--> statement-breakpoint
CREATE TABLE "surveys" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"implementer_id" varchar(255) NOT NULL,
	"project_id" text NOT NULL,
	"code" varchar(16) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "survey_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_audit_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"actor_kind" "survey_audit_actor" NOT NULL,
	"actor_user_id" varchar(255),
	"survey_id" text,
	"entity_type" varchar(64) NOT NULL,
	"entity_id" text NOT NULL,
	"action" varchar(64) NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"reason" text,
	CONSTRAINT "survey_audit_events_actor_check" CHECK (("survey_audit_events"."actor_kind" = 'USER') = ("survey_audit_events"."actor_user_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "survey_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"survey_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"status" "survey_version_status" DEFAULT 'DRAFT' NOT NULL,
	"based_on_version_id" text,
	"created_by" varchar(255) NOT NULL,
	"form" jsonb NOT NULL,
	CONSTRAINT "survey_versions_version_number_check" CHECK ("survey_versions"."version_number" >= 1),
	CONSTRAINT "survey_versions_form_check" CHECK ("survey_versions"."form"->>'format' = '1' and jsonb_typeof("survey_versions"."form"->'pages') = 'array')
);
--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "public"."implementers"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "survey_audit_events" ADD CONSTRAINT "survey_audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "survey_versions" ADD CONSTRAINT "survey_versions_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "survey_versions" ADD CONSTRAINT "survey_versions_based_on_version_id_fkey" FOREIGN KEY ("based_on_version_id") REFERENCES "public"."survey_versions"("id") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "survey_versions" ADD CONSTRAINT "survey_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "surveys_code_key" ON "surveys" USING btree ("code");--> statement-breakpoint
CREATE INDEX "surveys_implementer_id_project_id_idx" ON "surveys" USING btree ("implementer_id","project_id");--> statement-breakpoint
CREATE INDEX "surveys_project_id_idx" ON "surveys" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "surveys_created_by_idx" ON "surveys" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "survey_audit_events_entity_type_entity_id_idx" ON "survey_audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "survey_audit_events_survey_id_occurred_at_idx" ON "survey_audit_events" USING btree ("survey_id","occurred_at");--> statement-breakpoint
CREATE INDEX "survey_audit_events_actor_user_id_idx" ON "survey_audit_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_versions_survey_id_version_number_key" ON "survey_versions" USING btree ("survey_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_versions_one_draft_per_survey_key" ON "survey_versions" USING btree ("survey_id") WHERE "survey_versions"."status" = 'DRAFT';--> statement-breakpoint
CREATE INDEX "survey_versions_based_on_version_id_idx" ON "survey_versions" USING btree ("based_on_version_id");--> statement-breakpoint
CREATE INDEX "survey_versions_created_by_idx" ON "survey_versions" USING btree ("created_by");