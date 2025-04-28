ALTER TABLE "intervention_sessions"
DROP COLUMN "session_date";

ALTER TABLE "intervention_sessions"
RENAME COLUMN "session_date_tz" TO "session_date";