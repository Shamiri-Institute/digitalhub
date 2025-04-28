UPDATE intervention_sessions
SET session_date_tz = session_date AT TIME ZONE 'Africa/Nairobi';

ALTER TABLE "intervention_sessions" ALTER COLUMN "session_date_tz" SET NOT NULL;