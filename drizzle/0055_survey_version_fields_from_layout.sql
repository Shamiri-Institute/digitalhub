-- A version's answer fields are the ones its stored layout prints, written by the database when it
-- is published, so every published version has them, whichever code published it. The backfill
-- (0056) writes them for versions published before. survey_layout_fields is the one place layout
-- field kinds are mapped: a kind it doesn't map comes out null and fails the publish rather than
-- storing a guess, so a new layout kind needs a migration that replaces it.
CREATE FUNCTION survey_layout_fields(layout jsonb)
RETURNS TABLE (field text, page_number integer, kind survey_field_kind) AS $$
  SELECT
    f->>'field',
    (p->>'number')::integer,
    (CASE f->>'kind'
      WHEN 'choice' THEN
        CASE WHEN (f->>'multiple')::boolean THEN 'MULTIPLE_CHOICE' ELSE 'SINGLE_CHOICE' END
      WHEN 'digits' THEN 'DIGITS'
      WHEN 'date' THEN 'DATE'
      WHEN 'text' THEN 'TEXT'
      WHEN 'signature' THEN 'SIGNATURE'
    END)::survey_field_kind
  FROM jsonb_array_elements(layout->'pages') p
  CROSS JOIN LATERAL jsonb_array_elements(p->'fields') f
$$ LANGUAGE sql STABLE;--> statement-breakpoint

-- No ON CONFLICT: a layout that prints a field twice fails the publish on the primary key.
CREATE FUNCTION survey_versions_store_fields() RETURNS trigger AS $$
BEGIN
  INSERT INTO survey_version_fields (version_id, field, page_number, kind)
  SELECT NEW.id, l.field, l.page_number, l.kind FROM survey_layout_fields(NEW.layout) l;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER survey_versions_store_fields
AFTER UPDATE OF status ON survey_versions
FOR EACH ROW
WHEN (OLD.status = 'DRAFT' AND NEW.status = 'PUBLISHED' AND NEW.layout IS NOT NULL)
EXECUTE FUNCTION survey_versions_store_fields();--> statement-breakpoint

-- A field row is one its version's layout prints, on that page and of that kind; only a published
-- version has a layout (survey_versions_publish_check). Each
-- version's layout is read once per statement, as in survey_questionnaire_pages_in_layout (0042).
CREATE FUNCTION survey_version_fields_in_layout() RETURNS trigger AS $$
DECLARE
  bad record;
BEGIN
  WITH printed AS MATERIALIZED (
    SELECT v.id AS version_id, l.field, l.page_number, l.kind
    FROM survey_versions v
    CROSS JOIN LATERAL survey_layout_fields(v.layout) l
    WHERE v.id IN (SELECT version_id FROM new_fields) AND v.layout IS NOT NULL
  )
  SELECT n.version_id, n.field, n.page_number INTO bad
  FROM new_fields n
  WHERE NOT EXISTS (
    SELECT 1 FROM printed
    WHERE printed.version_id = n.version_id
      AND printed.field = n.field
      AND printed.page_number = n.page_number
      AND printed.kind = n.kind
  )
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'survey_version_fields %.%: its version is not published, or does not print it '
      'on page % as that kind', bad.version_id, bad.field, bad.page_number
      USING ERRCODE = 'check_violation', CONSTRAINT = 'survey_version_fields_in_layout';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER survey_version_fields_in_layout
AFTER INSERT ON survey_version_fields
REFERENCING NEW TABLE AS new_fields
FOR EACH STATEMENT EXECUTE FUNCTION survey_version_fields_in_layout();--> statement-breakpoint

-- Field rows are frozen with their version (0028): never changed, and deleted only with it. When
-- the version row is already gone, the delete is the cascade from deleting it.
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
