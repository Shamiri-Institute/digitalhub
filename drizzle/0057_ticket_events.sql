SET LOCAL lock_timeout = '5s';--> statement-breakpoint
CREATE TYPE "public"."ticket_event_kind" AS ENUM('CREATED', 'ESCALATED', 'REASSIGNED', 'RESOLVED');--> statement-breakpoint
CREATE TABLE "ticket_events" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" varchar(255) NOT NULL,
	"kind" "ticket_event_kind" NOT NULL,
	"actor_id" varchar(255) NOT NULL,
	"assignee_id" varchar(255),
	"reason" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "ticket_events_assignee_check" CHECK (("ticket_events"."kind" in ('CREATED', 'ESCALATED', 'REASSIGNED')) = ("ticket_events"."assignee_id" is not null)),
	CONSTRAINT "ticket_events_reason_check" CHECK ("ticket_events"."kind" = 'CREATED' or "ticket_events"."reason" is not null)
);
--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "holder_id" varchar(255);--> statement-breakpoint
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "ticket_events_ticket_id_created_at_idx" ON "ticket_events" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "ticket_events_actor_id_idx" ON "ticket_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "ticket_events_assignee_id_idx" ON "ticket_events" USING btree ("assignee_id");--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_holder_id_fkey" FOREIGN KEY ("holder_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "tickets_holder_id_idx" ON "tickets" USING btree ("holder_id");