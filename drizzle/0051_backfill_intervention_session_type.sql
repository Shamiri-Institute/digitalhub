SET LOCAL lock_timeout = '5s';--> statement-breakpoint
-- From December 2024 until May 2025, "Schedule a session" also offered intervention sessions and
-- saved them without session_type, which the reports that group intervention sessions by it read,
-- so those sessions dropped out of them. Copy it from each session's session_names row, as addSchool
-- writes it. Other session types never carry it.
UPDATE "intervention_sessions" AS i
SET "session_type" = n."session_name"
FROM "session_names" AS n
WHERE n."id" = i."session_id" AND n."session_type" = 'INTERVENTION' AND i."session_type" IS NULL;
