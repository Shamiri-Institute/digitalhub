-- The answer fields of versions published before survey_version_fields existed, read from the
-- layouts they printed with; storePublished writes them for every version published since, and
-- tests/unit/survey-scan-results.test.ts checks that the two agree. A kind this doesn't know
-- comes out null and fails the migration, rather than storing a guess.
INSERT INTO survey_version_fields (version_id, field, page_number, kind)
SELECT
  v.id,
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
FROM survey_versions v
CROSS JOIN LATERAL jsonb_array_elements(v.layout->'pages') p
CROSS JOIN LATERAL jsonb_array_elements(p->'fields') f
WHERE v.layout IS NOT NULL
ON CONFLICT (version_id, field) DO NOTHING;
