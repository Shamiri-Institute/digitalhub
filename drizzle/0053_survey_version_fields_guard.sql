-- A version's answer fields are frozen with it (0028): written when it is published, then never
-- changed. They are deleted only with their version: when the version row is already gone, the
-- delete is that cascade.
CREATE FUNCTION survey_version_fields_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1 FROM survey_versions v
      WHERE v.id = NEW.version_id AND v.status <> 'DRAFT' AND v.layout IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'survey_version_fields %.%: its version is not published', NEW.version_id,
        NEW.field
        USING ERRCODE = 'check_violation', CONSTRAINT = 'survey_version_fields_guard';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM survey_versions WHERE id = OLD.version_id) THEN
      RAISE EXCEPTION 'survey_version_fields %.% can only be deleted with its version',
        OLD.version_id, OLD.field
        USING ERRCODE = 'object_not_in_prerequisite_state';
    END IF;
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'survey_version_fields %.% does not change', OLD.version_id, OLD.field
    USING ERRCODE = 'object_not_in_prerequisite_state';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER survey_version_fields_guard BEFORE INSERT OR UPDATE OR DELETE ON survey_version_fields
FOR EACH ROW EXECUTE FUNCTION survey_version_fields_guard();
