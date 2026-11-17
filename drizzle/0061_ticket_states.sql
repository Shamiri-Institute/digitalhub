ALTER TYPE "public"."ticket_event_kind" ADD VALUE 'STARTED';--> statement-breakpoint
ALTER TYPE "public"."ticket_event_kind" ADD VALUE 'PRIORITY_CHANGED';--> statement-breakpoint
ALTER TYPE "public"."ticket_event_kind" ADD VALUE 'REOPENED';--> statement-breakpoint
ALTER TYPE "public"."ticket_event_kind" ADD VALUE 'CANCELLED';--> statement-breakpoint
ALTER TYPE "public"."ticket_event_kind" ADD VALUE 'CLOSED';--> statement-breakpoint
ALTER TYPE "public"."ticket_priority_level" ADD VALUE 'URGENT';--> statement-breakpoint
ALTER TYPE "public"."ticket_status" ADD VALUE 'IN_PROGRESS' BEFORE 'ESCALATED';--> statement-breakpoint
ALTER TYPE "public"."ticket_status" ADD VALUE 'CLOSED' BEFORE 'CANCELLED';--> statement-breakpoint
ALTER TABLE "ticket_events" DROP CONSTRAINT "ticket_events_reason_check";--> statement-breakpoint
ALTER TABLE "ticket_events" ALTER COLUMN "actor_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ticket_events" ADD COLUMN "from_value" text;--> statement-breakpoint
ALTER TABLE "ticket_events" ADD COLUMN "to_value" text;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "tickets_resolved_at_idx" ON "tickets" USING btree ("resolved_at") WHERE "tickets"."status" = 'RESOLVED';--> statement-breakpoint
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_actor_check" CHECK ("ticket_events"."kind"::text = 'CLOSED' or "ticket_events"."actor_id" is not null);--> statement-breakpoint
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_reason_check" CHECK ("ticket_events"."kind"::text in ('CREATED', 'STARTED', 'CLOSED') or "ticket_events"."reason" is not null);