-- A version's answer fields are the ones its stored layout prints, and are frozen with it (0028):
-- written when it is published, then never changed, and deleted only with their version. Each
-- version's layout is read once per statement, as in survey_questionnaire_pages_in_layout (0042).
CREATE FUNCTION survey_version_fields_in_layout() RETURNS trigger AS $$
DECLARE
  bad record;
BEGIN
  WITH printed AS MATERIALIZED (
    SELECT v.id AS version_id, f->>'field' AS field, (p->>'number')::integer AS page_number
    FROM survey_versions v
    CROSS JOIN LATERAL jsonb_array_elements(v.layout->'pages') p
    CROSS JOIN LATERAL jsonb_array_elements(p->'fields') f
    WHERE v.id IN (SELECT version_id FROM new_fields)
      AND v.status <> 'DRAFT'
      AND v.layout IS NOT NULL
  )
  SELECT n.version_id, n.field, n.page_number INTO bad
  FROM new_fields n
  WHERE NOT EXISTS (
    SELECT 1 FROM printed
    WHERE printed.version_id = n.version_id
      AND printed.field = n.field
      AND printed.page_number = n.page_number
  )
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'survey_version_fields %.%: its version is not published, or does not print it '
      'on page %', bad.version_id, bad.field, bad.page_number
      USING ERRCODE = 'check_violation', CONSTRAINT = 'survey_version_fields_in_layout';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER survey_version_fields_in_layout
AFTER INSERT ON survey_version_fields
REFERENCING NEW TABLE AS new_fields
FOR EACH STATEMENT EXECUTE FUNCTION survey_version_fields_in_layout();--> statement-breakpoint

-- When the version row is already gone, the delete is the cascade from deleting it.
CREATE FUNCTION survey_version_fields_guard() RETURNS trigger AS $$
BEGIN
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

CREATE TRIGGER survey_version_fields_guard BEFORE UPDATE OR DELETE ON survey_version_fields
FOR EACH ROW EXECUTE FUNCTION survey_version_fields_guard();
