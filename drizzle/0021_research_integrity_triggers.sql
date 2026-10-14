-- Integrity rules for the research tables from 0020 that drizzle cannot express in db/schema.ts.
--
-- 1. The membership identifier checks from 0014 cover the new RESEARCH role, so a research
--    membership always points at a research_users row, and that row cannot be renamed or deleted
--    while a membership points at it.
-- 2. A survey version only changes while it is a DRAFT, and neither do its pages and questions.
--    Printed copies are read back against the version they were printed from, so a published
--    version is frozen, and is deleted only together with its whole survey.
-- 3. survey_audit_events is append-only.

-- Extend the membership identifier checks from 0014 to the RESEARCH role. The 'RESEARCH' literals
-- are only cast when the triggers run, so they are safe in the same transaction as ADD VALUE.
CREATE OR REPLACE FUNCTION implementer_members_identifier_exists() RETURNS trigger AS $$
DECLARE
  membership implementer_members%ROWTYPE;
BEGIN
  SELECT * INTO membership FROM implementer_members WHERE id = NEW.id;
  IF NOT FOUND OR membership.identifier IS NULL OR (CASE membership.role
    WHEN 'ADMIN' THEN EXISTS (SELECT 1 FROM admin_users WHERE id = membership.identifier)
    WHEN 'HUB_COORDINATOR' THEN EXISTS (SELECT 1 FROM hub_coordinators WHERE id = membership.identifier)
    WHEN 'SUPERVISOR' THEN EXISTS (SELECT 1 FROM supervisors WHERE id = membership.identifier)
    WHEN 'FELLOW' THEN EXISTS (SELECT 1 FROM fellows WHERE id = membership.identifier)
    WHEN 'CLINICAL_LEAD' THEN EXISTS (SELECT 1 FROM clinical_leads WHERE id = membership.identifier)
    WHEN 'CLINICAL_TEAM' THEN EXISTS (SELECT 1 FROM clinical_teams WHERE id = membership.identifier)
    WHEN 'OPERATIONS' THEN EXISTS (SELECT 1 FROM ops_users WHERE id = membership.identifier)
    WHEN 'RESEARCH' THEN EXISTS (SELECT 1 FROM research_users WHERE id = membership.identifier)
  END) THEN
    RETURN NULL;
  END IF;
  RAISE EXCEPTION 'implementer_members % points at % %, which does not exist',
    membership.id, membership.role, membership.identifier
    USING ERRCODE = 'foreign_key_violation';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE CONSTRAINT TRIGGER research_users_keeps_memberships AFTER UPDATE OF id OR DELETE ON research_users
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION profile_keeps_memberships('RESEARCH');
--> statement-breakpoint

-- A version keeps its survey and number. Its status only moves DRAFT -> PUBLISHED -> RETIRED, and
-- past DRAFT nothing but the status changes. based_on_version_id may only be cleared, which its
-- foreign key does when the version it names is deleted. A version that is not a DRAFT is deleted
-- only with its survey: when the survey row is already gone, the delete is that cascade.
CREATE FUNCTION survey_versions_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'DRAFT' AND EXISTS (SELECT 1 FROM surveys WHERE id = OLD.survey_id) THEN
      RAISE EXCEPTION 'survey_versions % is %, so it can only be deleted with its survey', OLD.id,
        OLD.status
        USING ERRCODE = 'object_not_in_prerequisite_state';
    END IF;
    RETURN OLD;
  END IF;
  IF NEW.survey_id <> OLD.survey_id OR NEW.version_number <> OLD.version_number
    OR (NEW.based_on_version_id IS DISTINCT FROM OLD.based_on_version_id
      AND NEW.based_on_version_id IS NOT NULL) THEN
    RAISE EXCEPTION 'survey_versions % cannot change its survey, number or source version', OLD.id
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  IF NEW.status <> OLD.status
    AND NOT ((OLD.status = 'DRAFT' AND NEW.status = 'PUBLISHED')
      OR (OLD.status = 'PUBLISHED' AND NEW.status = 'RETIRED')) THEN
    RAISE EXCEPTION 'survey_versions % cannot go from % to %', OLD.id, OLD.status, NEW.status
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  IF OLD.status <> 'DRAFT'
    AND to_jsonb(NEW) - 'status' - 'updated_at' - 'based_on_version_id'
      <> to_jsonb(OLD) - 'status' - 'updated_at' - 'based_on_version_id' THEN
    RAISE EXCEPTION 'survey_versions % is %, so only its status can change', OLD.id, OLD.status
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER survey_versions_guard BEFORE UPDATE OR DELETE ON survey_versions
FOR EACH ROW EXECUTE FUNCTION survey_versions_guard();--> statement-breakpoint

-- Pages and questions can only be written while their version is a DRAFT. FOR SHARE holds the
-- version row until commit, so a concurrent publish waits for the edit instead of racing it. A
-- version that no longer exists is being deleted, and its pages and questions go with it.
CREATE FUNCTION survey_content_is_draft() RETURNS trigger AS $$
DECLARE
  version_status survey_version_status;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT status INTO version_status FROM survey_versions WHERE id = OLD.version_id FOR SHARE;
    IF FOUND AND version_status <> 'DRAFT' THEN
      RAISE EXCEPTION '% % belongs to a % version, which cannot change', TG_TABLE_NAME, OLD.id,
        version_status
        USING ERRCODE = 'object_not_in_prerequisite_state';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  SELECT status INTO version_status FROM survey_versions WHERE id = NEW.version_id FOR SHARE;
  IF FOUND AND version_status <> 'DRAFT' THEN
    RAISE EXCEPTION '% % belongs to a % version, which cannot change', TG_TABLE_NAME, NEW.id,
      version_status
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER survey_pages_content_is_draft BEFORE INSERT OR UPDATE OR DELETE ON survey_pages
FOR EACH ROW EXECUTE FUNCTION survey_content_is_draft();--> statement-breakpoint
CREATE TRIGGER survey_questions_content_is_draft BEFORE INSERT OR UPDATE OR DELETE ON survey_questions
FOR EACH ROW EXECUTE FUNCTION survey_content_is_draft();--> statement-breakpoint

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
