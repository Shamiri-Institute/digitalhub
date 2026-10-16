-- Integrity rules for the survey tables from 0027 that drizzle cannot express in db/schema.ts.
--
-- A version's status only moves DRAFT -> PUBLISHED -> RETIRED. Nothing is unpublished: changing a
-- published survey means a new DRAFT version copied from it. Printed copies are read back against
-- the version they were printed from, so a published version is frozen, form included, and it is
-- deleted only together with its whole survey. survey_audit_events is append-only.

-- A version is created as a DRAFT and keeps its survey, number and source version. Its status
-- only moves DRAFT -> PUBLISHED -> RETIRED, and past DRAFT nothing but the status changes. A
-- version that is not a DRAFT is deleted only with its survey: when the survey row is already
-- gone, the delete is that cascade.
CREATE FUNCTION survey_versions_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'DRAFT' THEN
      RAISE EXCEPTION 'survey_versions % must be created as a DRAFT, not %', NEW.id, NEW.status
        USING ERRCODE = 'object_not_in_prerequisite_state';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'DRAFT' AND EXISTS (SELECT 1 FROM surveys WHERE id = OLD.survey_id) THEN
      RAISE EXCEPTION 'survey_versions % is %, so it can only be deleted with its survey', OLD.id,
        OLD.status
        USING ERRCODE = 'object_not_in_prerequisite_state';
    END IF;
    RETURN OLD;
  END IF;

  IF (NEW.survey_id, NEW.version_number, NEW.based_on_version_id)
      IS DISTINCT FROM (OLD.survey_id, OLD.version_number, OLD.based_on_version_id)
    OR OLD.status::text || '>' || NEW.status::text NOT IN (
      'DRAFT>DRAFT', 'DRAFT>PUBLISHED', 'PUBLISHED>PUBLISHED', 'PUBLISHED>RETIRED', 'RETIRED>RETIRED')
    OR (OLD.status <> 'DRAFT'
      AND to_jsonb(NEW) - 'status' - 'updated_at' <> to_jsonb(OLD) - 'status' - 'updated_at') THEN
    RAISE EXCEPTION 'survey_versions % cannot change from % to %: a version keeps its survey and '
      'number, moves DRAFT -> PUBLISHED -> RETIRED, and past DRAFT only its status changes',
      OLD.id, OLD.status, NEW.status
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER survey_versions_guard BEFORE INSERT OR UPDATE OR DELETE ON survey_versions
FOR EACH ROW EXECUTE FUNCTION survey_versions_guard();--> statement-breakpoint

-- The audit history is append-only for the application. TRUNCATE is left to the table owner, for
-- the seed and database resets.
CREATE FUNCTION survey_audit_events_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'survey_audit_events is append-only; % is not allowed', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER survey_audit_events_append_only BEFORE UPDATE OR DELETE ON survey_audit_events
FOR EACH ROW EXECUTE FUNCTION survey_audit_events_append_only();
