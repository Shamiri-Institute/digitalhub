-- Integrity rules for the print files from 0043 that drizzle cannot express in db/schema.ts.
--
-- A run is now made with its file plan and never changes. What used to be checked when a run's
-- copies were inserted (the school is in the hub, each student at their school) is checked when
-- its files are planned, because the copies are now inserted later, by the job, and schools and
-- students may move in between. Copies are checked against their file's plan instead.

CREATE OR REPLACE FUNCTION survey_print_runs_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM survey_versions v
      JOIN surveys s ON s.id = v.survey_id
      JOIN hubs h ON h.id = NEW.hub_id
      WHERE v.id = NEW.version_id
        AND v.status = 'PUBLISHED'
        AND v.layout IS NOT NULL
        AND s.status = 'ACTIVE'
        AND h.implementer_id = s.implementer_id
        AND h.project_id = s.project_id
    ) THEN
      RAISE EXCEPTION 'survey_print_runs %: version % is not a published version of an active '
        'survey of hub %''s implementer and project', NEW.id, NEW.version_id, NEW.hub_id
        USING ERRCODE = 'check_violation', CONSTRAINT = 'survey_print_runs_guard';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'survey_print_runs % does not change', OLD.id
    USING ERRCODE = 'object_not_in_prerequisite_state';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

-- A run's files are for schools of its hub, list students exactly when its version prints them,
-- each at the file's school and none twice, and number its copies exactly once: together they
-- cover its serial block without a gap or an overlap. A run's files are inserted in one statement,
-- so this sees all of them.
CREATE FUNCTION survey_print_files_plan_check() RETURNS trigger AS $$
DECLARE
  bad record;
BEGIN
  SELECT f.id INTO bad
  FROM new_files f
  JOIN survey_print_runs r ON r.id = f.print_run_id
  JOIN survey_versions v ON v.id = r.version_id
  JOIN schools s ON s.id = f.school_id
  WHERE s.hub_id IS DISTINCT FROM r.hub_id
     OR (f.student_ids IS NOT NULL) IS DISTINCT FROM (v.prefill = 'STUDENT')
     OR EXISTS (
       SELECT 1
       FROM unnest(f.student_ids) AS planned(student_id)
       LEFT JOIN students st ON st.id = planned.student_id
       WHERE st.school_id IS DISTINCT FROM f.school_id
     )
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'survey_print_files %: its school or students are not its run''s', bad.id
      USING ERRCODE = 'check_violation', CONSTRAINT = 'survey_print_files_plan_check';
  END IF;

  SELECT r.id INTO bad
  FROM survey_print_runs r
  WHERE r.id IN (SELECT print_run_id FROM new_files)
    AND (
      (SELECT sum(f.copy_count) FROM survey_print_files f WHERE f.print_run_id = r.id)
        IS DISTINCT FROM r.copy_count
      OR (SELECT min(f.first_serial_number) FROM survey_print_files f WHERE f.print_run_id = r.id)
        IS DISTINCT FROM r.first_serial_number
      OR EXISTS (
        SELECT 1
        FROM (
          SELECT f.first_serial_number,
            lag(f.first_serial_number + f.copy_count) OVER (ORDER BY f.first_serial_number) AS next
          FROM survey_print_files f
          WHERE f.print_run_id = r.id
        ) tiles
        WHERE tiles.next <> tiles.first_serial_number
      )
      OR EXISTS (
        SELECT 1
        FROM survey_print_files f, unnest(f.student_ids) AS planned(student_id)
        WHERE f.print_run_id = r.id
        GROUP BY planned.student_id
        HAVING count(*) > 1
      )
    )
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'survey_print_runs %: its files do not number its copies once each', bad.id
      USING ERRCODE = 'check_violation', CONSTRAINT = 'survey_print_files_plan_check';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER survey_print_files_plan_check
AFTER INSERT ON survey_print_files
REFERENCING NEW TABLE AS new_files
FOR EACH STATEMENT EXECUTE FUNCTION survey_print_files_plan_check();--> statement-breakpoint

-- A file's plan never changes, its copies are issued once, and its status moves QUEUED to
-- RENDERING, then back to QUEUED for a retry, or on to READY or FAILED; a failed file can be
-- queued again, and a ready one is final. RENDERING to RENDERING is a worker taking over a lease
-- that ran out.
CREATE FUNCTION survey_print_files_guard() RETURNS trigger AS $$
DECLARE
  job_columns text[] := ARRAY['status', 'attempts', 'lease_token', 'leased_until', 'issued_at',
    'byte_size', 'rendered_at', 'error', 'updated_at'];
BEGIN
  IF to_jsonb(NEW) - job_columns <> to_jsonb(OLD) - job_columns THEN
    RAISE EXCEPTION 'survey_print_files %: its plan does not change', OLD.id
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  IF OLD.issued_at IS NOT NULL AND NEW.issued_at IS DISTINCT FROM OLD.issued_at THEN
    RAISE EXCEPTION 'survey_print_files %: its copies are issued once', OLD.id
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  IF NOT (
    (OLD.status, NEW.status) IN (
      ('QUEUED', 'QUEUED'), ('QUEUED', 'RENDERING'), ('RENDERING', 'RENDERING'),
      ('RENDERING', 'QUEUED'), ('RENDERING', 'READY'), ('RENDERING', 'FAILED'),
      ('FAILED', 'QUEUED')
    )
  ) THEN
    RAISE EXCEPTION 'survey_print_files %: % cannot become %', OLD.id, OLD.status, NEW.status
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER survey_print_files_guard BEFORE UPDATE ON survey_print_files
FOR EACH ROW EXECUTE FUNCTION survey_print_files_guard();--> statement-breakpoint

-- A copy is the one its file planned: in the file's serial range, at its school, and for the
-- student it lists in that place. The run's key already ties the copy to its version and hub.
CREATE OR REPLACE FUNCTION survey_questionnaires_issue_check() RETURNS trigger AS $$
DECLARE
  bad record;
BEGIN
  SELECT c.id, c.serial INTO bad
  FROM new_copies c
  LEFT JOIN survey_print_files f
    ON f.print_run_id = c.print_run_id
   AND c.serial_number BETWEEN f.first_serial_number AND f.first_serial_number + f.copy_count - 1
  WHERE f.id IS NULL
     OR f.school_id IS DISTINCT FROM c.school_id
     OR c.student_id IS DISTINCT FROM f.student_ids[c.serial_number - f.first_serial_number + 1]
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'survey_questionnaires % (%) is not a copy its print file planned',
      bad.serial, bad.id
      USING ERRCODE = 'check_violation', CONSTRAINT = 'survey_questionnaires_issue_check';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
