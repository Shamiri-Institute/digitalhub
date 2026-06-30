-- Seed session names for all hubs in 2026_Project_2 (amounts from hubSessionTypes)
-- The NOT EXISTS guard ensures only hubs without session names (e.g. the new JSS Program v2 hub) are seeded.
INSERT INTO "session_names" (
    "id",
    "sessionType",
    "session_name",
    "session_label",
    "hub_id",
    "currency",
    "amount",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid()::text,
    s.session_type::session_types,
    s.session_name,
    s.session_label,
    h.id AS hub_id,
    'KES' AS currency,
    s.amount,
    CURRENT_TIMESTAMP AS created_at,
    CURRENT_TIMESTAMP AS updated_at
FROM (
    -- Pre-session
    SELECT 'INTERVENTION' AS session_type, 's0' AS session_name, 'Pre-session' AS session_label, 1000 AS amount
    UNION ALL
    -- Intervention sessions
    SELECT 'INTERVENTION', 's1', 'Session 1', 1500
    UNION ALL
    SELECT 'INTERVENTION', 's2', 'Session 2', 1500
    UNION ALL
    SELECT 'INTERVENTION', 's3', 'Session 3', 1500
    UNION ALL
    SELECT 'INTERVENTION', 's4', 'Session 4', 1500
    UNION ALL
    -- Supervision sessions (up to sv7)
    SELECT 'SUPERVISION', 'sv1', 'Supervision 1', 500
    UNION ALL
    SELECT 'SUPERVISION', 'sv2', 'Supervision 2', 500
    UNION ALL
    SELECT 'SUPERVISION', 'sv3', 'Supervision 3', 500
    UNION ALL
    SELECT 'SUPERVISION', 'sv4', 'Supervision 4', 500
    UNION ALL
    SELECT 'SUPERVISION', 'sv5', 'Supervision 5', 500
    UNION ALL
    SELECT 'SUPERVISION', 'sv6', 'Supervision 6', 500
    UNION ALL
    SELECT 'SUPERVISION', 'sv7', 'Supervision 7', 500
    UNION ALL
    -- Training sessions
    SELECT 'TRAINING', 't1', 'Training 1', 1000
    UNION ALL
    SELECT 'TRAINING', 't2', 'Training 2', 1000
    UNION ALL
    SELECT 'TRAINING', 't3', 'Training 3', 1000
    UNION ALL
    SELECT 'TRAINING', 't4', 'Training 4', 1000
    UNION ALL
    SELECT 'TRAINING', 't5', 'Training 5', 1000
    UNION ALL
    -- Clinical sessions
    SELECT 'CLINICAL', 'cl1', 'Clinical 1', 0
    UNION ALL
    SELECT 'CLINICAL', 'cl2', 'Clinical 2', 0
    UNION ALL
    SELECT 'CLINICAL', 'cl3', 'Clinical 3', 0
    UNION ALL
    SELECT 'CLINICAL', 'cl4', 'Clinical 4', 0
    UNION ALL
    SELECT 'CLINICAL', 'cl5', 'Clinical 5', 0
    UNION ALL
    SELECT 'CLINICAL', 'cl6', 'Clinical 6', 0
    UNION ALL
    SELECT 'CLINICAL', 'cl7', 'Clinical 7', 0
    UNION ALL
    SELECT 'CLINICAL', 'cl8', 'Clinical 8', 0
    UNION ALL
    -- Data Follow Up sessions
    SELECT 'DATA_COLLECTION', 'dfu1', 'Data Follow Up 1', 500
    UNION ALL
    SELECT 'DATA_COLLECTION', 'dfu2', 'Data Follow Up 2', 500
    UNION ALL
    SELECT 'DATA_COLLECTION', 'dfu3', 'Data Follow Up 3', 500
    UNION ALL
    SELECT 'DATA_COLLECTION', 'dfu4', 'Data Follow Up 4', 500
    UNION ALL
    SELECT 'DATA_COLLECTION', 'dfu5', 'Data Follow Up 5', 500
    UNION ALL
    SELECT 'DATA_COLLECTION', 'dfu6', 'Data Follow Up 6', 500
) s
CROSS JOIN "hubs" h
WHERE h."project_id" = '2026_Project_2'
  AND NOT EXISTS (
      SELECT 1
      FROM "session_names" sn
      WHERE sn."hub_id" = h.id
        AND sn."sessionType" = s.session_type::session_types
        AND sn."session_name" = s.session_name
  );
