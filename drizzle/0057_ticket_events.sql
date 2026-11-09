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
CREATE INDEX "tickets_holder_id_idx" ON "tickets" USING btree ("holder_id");;--> statement-breakpoint
-- A reassign overwrote the escalation's recipient, so the escalation went to whoever it was
-- reassigned from. The first escalation of a ticket is the one its creation made.
INSERT INTO "ticket_events" ("id", "ticket_id", "kind", "actor_id", "assignee_id", "reason", "created_at")
SELECT e."id", e."ticket_id",
  (CASE WHEN row_number() OVER (PARTITION BY e."ticket_id" ORDER BY e."created_at", e."id") = 1
    THEN 'CREATED' ELSE 'ESCALATED' END)::"ticket_event_kind",
  e."escalated_by", coalesce(r."reassigned_from", e."escalated_to"), e."escalation_reason", e."created_at"
FROM "ticket_escalations" e
LEFT JOIN "ticket_reassignments" r ON r."escalation_id" = e."id";--> statement-breakpoint
INSERT INTO "ticket_events" ("id", "ticket_id", "kind", "actor_id", "assignee_id", "reason", "created_at")
SELECT "id", "ticket_id", 'REASSIGNED', "reassigned_from", "reassigned_to", "reassignment_reason", "created_at"
FROM "ticket_reassignments";--> statement-breakpoint
INSERT INTO "ticket_events" ("id", "ticket_id", "kind", "actor_id", "reason", "created_at")
SELECT "id", "ticket_id", 'RESOLVED', "resolved_by", "resolution_reason", "created_at"
FROM "ticket_resolutions";--> statement-breakpoint
UPDATE "tickets" t SET "holder_id" = (
  SELECT e."assignee_id" FROM "ticket_events" e
  WHERE e."ticket_id" = t."id" AND e."assignee_id" IS NOT NULL
  ORDER BY e."created_at" DESC
  LIMIT 1
);--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "holder_id" SET NOT NULL;--> statement-breakpoint
DROP TABLE "ticket_reassignments";--> statement-breakpoint
DROP TABLE "ticket_resolutions";--> statement-breakpoint
DROP TABLE "ticket_escalations";