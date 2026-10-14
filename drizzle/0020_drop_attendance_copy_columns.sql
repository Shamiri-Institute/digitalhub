SET LOCAL lock_timeout = '5s';--> statement-breakpoint
-- Sessions without a project take the one project their attendance copies agree on, so no
-- attendance loses its project when the copies are dropped.
UPDATE "intervention_sessions" s
SET "project_id" = copies.project_id
FROM (
  SELECT session_id, min(project_id) AS project_id
  FROM (
    SELECT session_id, project_id FROM "student_attendances"
    UNION ALL SELECT session_id, project_id FROM "fellow_attendances"
    UNION ALL SELECT session_id, project_id FROM "supervisor_attendances"
  ) a
  WHERE session_id IS NOT NULL AND project_id IS NOT NULL
  GROUP BY session_id
  HAVING count(DISTINCT project_id) = 1
) copies
WHERE s.id = copies.session_id AND s.project_id IS NULL;--> statement-breakpoint
ALTER TABLE "fellow_attendances" DROP CONSTRAINT "fellow_attendances_project_id_fkey";
--> statement-breakpoint
ALTER TABLE "fellow_group_reports" DROP CONSTRAINT "fellow_group_reports_project_id_fkey";
--> statement-breakpoint
ALTER TABLE "student_attendances" DROP CONSTRAINT "student_attendances_project_id_fkey";
--> statement-breakpoint
ALTER TABLE "student_attendances" DROP CONSTRAINT "student_attendances_school_id_fkey";
--> statement-breakpoint
ALTER TABLE "supervisor_attendances" DROP CONSTRAINT "supervisor_attendances_project_id_fkey";
--> statement-breakpoint
ALTER TABLE "supervisor_attendances" DROP CONSTRAINT "supervisor_attendances_school_id_fkey";
--> statement-breakpoint
DROP INDEX "fellow_group_reports_project_id_idx";--> statement-breakpoint
ALTER TABLE "fellow_attendances" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "fellow_group_reports" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "student_attendances" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "student_attendances" DROP COLUMN "school_id";--> statement-breakpoint
ALTER TABLE "supervisor_attendances" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "supervisor_attendances" DROP COLUMN "school_id";