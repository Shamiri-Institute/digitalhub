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
);
