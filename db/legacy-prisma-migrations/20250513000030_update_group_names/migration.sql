-- Update group names to use school initials
WITH school_groups AS (
  SELECT 
    ig.id as group_id,
    s.school_name,
    ig.group_name,
    CASE 
      WHEN s.school_name IS NOT NULL THEN
        UPPER(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(s.school_name, '[^a-zA-Z0-9 ]', '', 'g'),
              '\m(school)\M', '', 'gi'
            ),
            '(\w)\w*\s*', '\1', 'g'
          )
        )
      ELSE 'GROUP'
    END as new_prefix
  FROM "intervention_groups" ig
  JOIN "schools" s ON ig.school_id = s.id
  JOIN "hubs" h ON s.hub_id = h.id
  WHERE h.project_id = '2025_Project_1'
    AND ig.archived_at IS NULL
)
UPDATE "intervention_groups" ig
SET group_name = sg.new_prefix || ' ' || SUBSTRING(sg.group_name FROM '(\d+)$')
FROM school_groups sg
WHERE ig.id = sg.group_id; 