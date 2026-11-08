SET LOCAL lock_timeout = '5s';--> statement-breakpoint
-- Until "Schedule a session" stopped offering intervention sessions, the intervention sessions it
-- saved lacked session_type, which the reports that group intervention sessions by it read, so
-- those sessions dropped out of them. Copy it from each session's session_names row, as the
-- sessions a new school is given carry it. Other session types never carry it.
UPDATE "intervention_sessions" AS i
SET "session_type" = n."session_name"
FROM "session_names" AS n
WHERE n."id" = i."session_id" AND n."session_type" = 'INTERVENTION' AND i."session_type" IS NULL;
