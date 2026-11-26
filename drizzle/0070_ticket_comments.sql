ALTER TYPE "public"."ticket_event_kind" ADD VALUE 'COMMENTED';--> statement-breakpoint
CREATE TABLE "ticket_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" varchar(255) NOT NULL,
	"event_id" varchar(255) NOT NULL,
	"uploaded_by" varchar(255) NOT NULL,
	"s3_key" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ticket_events" DROP CONSTRAINT "ticket_events_reason_check";--> statement-breakpoint
ALTER TABLE "ticket_events" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ticket_events" ADD COLUMN "archived_by" varchar(255);--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."ticket_events"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_attachments_s3_key_key" ON "ticket_attachments" USING btree ("s3_key");--> statement-breakpoint
CREATE INDEX "ticket_attachments_ticket_id_idx" ON "ticket_attachments" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_attachments_event_id_idx" ON "ticket_attachments" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "ticket_attachments_uploaded_by_idx" ON "ticket_attachments" USING btree ("uploaded_by");--> statement-breakpoint
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "ticket_events_archived_by_idx" ON "ticket_events" USING btree ("archived_by");--> statement-breakpoint
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_archived_check" CHECK (("ticket_events"."archived_at" is null) = ("ticket_events"."archived_by" is null) and ("ticket_events"."archived_at" is null or "ticket_events"."kind"::text = 'COMMENTED'));--> statement-breakpoint
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_reason_check" CHECK ("ticket_events"."kind"::text in ('CREATED', 'STARTED', 'CLOSED', 'COMMENTED') or "ticket_events"."reason" is not null);