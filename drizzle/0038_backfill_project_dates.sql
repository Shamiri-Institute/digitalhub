-- These projects predate the date fields; their first and last session stand in.
UPDATE "projects" AS p
SET "actual_start_date" = s."first_day", "actual_end_date" = s."last_day"
FROM (
  SELECT
    "project_id",
    min(("session_date" AT TIME ZONE 'Africa/Nairobi')::date) AS "first_day",
    max(("session_date" AT TIME ZONE 'Africa/Nairobi')::date) AS "last_day"
  FROM "intervention_sessions"
  GROUP BY "project_id"
) AS s
WHERE s."project_id" = p."id"
  AND p."visible_id" IN ('2023_Project_2', '2024_Project_1', '2024P2_Project_1')
  AND p."actual_start_date" IS NULL
  AND p."actual_end_date" IS NULL;
