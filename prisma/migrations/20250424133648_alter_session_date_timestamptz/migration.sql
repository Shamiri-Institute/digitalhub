ALTER TABLE intervention_sessions
ALTER COLUMN session_date TYPE timestamptz
USING session_date AT TIME ZONE 'Africa/Nairobi';
