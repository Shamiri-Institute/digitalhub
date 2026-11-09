-- Versions published before survey_version_fields existed. Running it again changes nothing.
INSERT INTO survey_version_fields (version_id, field, page_number, kind)
SELECT v.id, l.field, l.page_number, l.kind
FROM survey_versions v
CROSS JOIN LATERAL survey_layout_fields(v.layout) l
WHERE v.layout IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM survey_version_fields f WHERE f.version_id = v.id);
