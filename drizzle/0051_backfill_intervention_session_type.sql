SET LOCAL lock_timeout = '5s';--> statement-breakpoint
-- "Schedule a session" saved sessions without session_type, which the reports that group or label
-- sessions by it read, so those sessions dropped out of them. Copy it from each session's
-- session_names row, as the sessions a new school is given already carry it.
UPDATE "intervention_sessions" AS i
SET "session_type" = n."session_name"
FROM "session_names" AS n
WHERE n."id" = i."session_id" AND i."session_type" IS NULL;
