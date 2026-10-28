-- Integrity rules for the print-run tables from 0038 that drizzle cannot express in db/schema.ts.
--
-- A print run, its copies and their pages are history once issued: only a status moves. What they
-- point at is checked when they are issued, not kept, because schools move between hubs and
-- students between schools afterwards.

-- A run is for a published version of an active survey, and for a hub of the survey's implementer
-- and project. Afterwards only its status changes.
CREATE FUNCTION survey_print_runs_guard() RETURNS trigger AS $$
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

  IF to_jsonb(NEW) - 'status' - 'updated_at' <> to_jsonb(OLD) - 'status' - 'updated_at' THEN
    RAISE EXCEPTION 'survey_print_runs %: only its status can change', OLD.id
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER survey_print_runs_guard BEFORE INSERT OR UPDATE ON survey_print_runs
FOR EACH ROW EXECUTE FUNCTION survey_print_runs_guard();--> statement-breakpoint

-- A copy's school is in the copy's hub, its serial number is in its run's block, and it has a
-- student, at that school, exactly when its version prints student details. The run's key already
-- ties the copy to a published version and the run's hub. One query per inserted statement, not
-- per row: a run inserts up to 50,000 copies.
CREATE FUNCTION survey_questionnaires_issue_check() RETURNS trigger AS $$
DECLARE
  bad record;
BEGIN
  WITH versions AS MATERIALIZED (
    SELECT v.id, v.prefill FROM survey_versions v
    WHERE v.id IN (SELECT version_id FROM new_copies)
  )
  SELECT c.id, c.serial INTO bad
  FROM new_copies c
  JOIN versions v ON v.id = c.version_id
  JOIN survey_print_runs r ON r.id = c.print_run_id
  JOIN schools s ON s.id = c.school_id
  LEFT JOIN students st ON st.id = c.student_id
  WHERE s.hub_id IS DISTINCT FROM c.hub_id
     OR c.serial_number NOT BETWEEN r.first_serial_number
                                AND r.first_serial_number + r.copy_count - 1
     OR (c.student_id IS NOT NULL) IS DISTINCT FROM (v.prefill = 'STUDENT')
     OR (c.student_id IS NOT NULL AND st.school_id IS DISTINCT FROM c.school_id)
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'survey_questionnaires % (%) does not match its hub, school, student or run',
      bad.serial, bad.id
      USING ERRCODE = 'check_violation', CONSTRAINT = 'survey_questionnaires_issue_check';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER survey_questionnaires_issue_check
AFTER INSERT ON survey_questionnaires
REFERENCING NEW TABLE AS new_copies
FOR EACH STATEMENT EXECUTE FUNCTION survey_questionnaires_issue_check();--> statement-breakpoint

-- A copy's identity is fixed at issue; only its status moves, and VOID is final.
CREATE FUNCTION survey_questionnaires_guard() RETURNS trigger AS $$
BEGIN
  IF to_jsonb(NEW) - 'status' - 'updated_at' <> to_jsonb(OLD) - 'status' - 'updated_at' THEN
    RAISE EXCEPTION 'survey_questionnaires %: only its status can change', OLD.serial
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  IF OLD.status = 'VOID' AND NEW.status <> 'VOID' THEN
    RAISE EXCEPTION 'survey_questionnaires % is void, and stays void', OLD.serial
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER survey_questionnaires_guard BEFORE UPDATE ON survey_questionnaires
FOR EACH ROW EXECUTE FUNCTION survey_questionnaires_guard();--> statement-breakpoint

-- A copy has only the pages its version's layout prints. The page counts are read once per
-- version for the whole statement, so a large layout is not read again for every page row.
CREATE FUNCTION survey_questionnaire_pages_in_layout() RETURNS trigger AS $$
DECLARE
  bad record;
BEGIN
  WITH page_counts AS MATERIALIZED (
    SELECT v.id, jsonb_array_length(v.layout->'pages') AS page_count
    FROM survey_versions v
    WHERE v.id IN (
      SELECT q.version_id FROM survey_questionnaires q
      WHERE q.id IN (SELECT questionnaire_id FROM new_pages)
    )
  )
  SELECT p.questionnaire_id, p.page_number INTO bad
  FROM new_pages p
  JOIN survey_questionnaires q ON q.id = p.questionnaire_id
  LEFT JOIN page_counts c ON c.id = q.version_id
  WHERE c.page_count IS NULL OR p.page_number > c.page_count
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'survey_questionnaires % has no page %: its version does not print it',
      bad.questionnaire_id, bad.page_number
      USING ERRCODE = 'check_violation', CONSTRAINT = 'survey_questionnaire_pages_in_layout';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER survey_questionnaire_pages_in_layout
AFTER INSERT ON survey_questionnaire_pages
REFERENCING NEW TABLE AS new_pages
FOR EACH STATEMENT EXECUTE FUNCTION survey_questionnaire_pages_in_layout();--> statement-breakpoint

CREATE FUNCTION survey_questionnaire_pages_guard() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'survey_questionnaire_pages % does not change', OLD.code
    USING ERRCODE = 'object_not_in_prerequisite_state';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER survey_questionnaire_pages_guard BEFORE UPDATE ON survey_questionnaire_pages
FOR EACH ROW EXECUTE FUNCTION survey_questionnaire_pages_guard();
