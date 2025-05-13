-- Seed session names for all hubs
INSERT INTO "session_names" ("sessionType", "session_name", "session_label", "hub_id", "currency", "amount", "id", "created_at", "updated_at")
SELECT 
    s.session_type,
    s.session_name,
    s.session_label,
    h.id as hub_id,
    'KES' as currency,
    s.amount,
    gen_random_uuid() as id,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM (
    -- Pre-session
    SELECT 'INTERVENTION'::session_types as session_type, 's0' as session_name, 'Pre-session' as session_label, 500 as amount
    UNION ALL
    -- Intervention sessions
    SELECT 'INTERVENTION'::session_types, 's1', 'Session 1', 1500
    UNION ALL
    SELECT 'INTERVENTION'::session_types, 's2', 'Session 2', 1500
    UNION ALL
    SELECT 'INTERVENTION'::session_types, 's3', 'Session 3', 1500
    UNION ALL
    SELECT 'INTERVENTION'::session_types, 's4', 'Session 4', 1500
    -- Supervision sessions
    UNION ALL
    SELECT 'SUPERVISION'::session_types, 'sv1', 'Supervision 1', 0
    UNION ALL
    SELECT 'SUPERVISION'::session_types, 'sv2', 'Supervision 2', 0
    UNION ALL
    SELECT 'SUPERVISION'::session_types, 'sv3', 'Supervision 3', 0
    UNION ALL
    SELECT 'SUPERVISION'::session_types, 'sv4', 'Supervision 4', 0
    UNION ALL
    SELECT 'SUPERVISION'::session_types, 'sv5', 'Supervision 5', 0
    -- Training sessions
    UNION ALL
    SELECT 'TRAINING'::session_types, 't1', 'Training 1', 1000
    UNION ALL
    SELECT 'TRAINING'::session_types, 't2', 'Training 2', 1000
    UNION ALL
    SELECT 'TRAINING'::session_types, 't3', 'Training 3', 1000
    UNION ALL
    SELECT 'TRAINING'::session_types, 't4', 'Training 4', 1000
    UNION ALL
    SELECT 'TRAINING'::session_types, 't5', 'Training 5', 1000
    -- Clinical sessions
    UNION ALL
    SELECT 'CLINICAL'::session_types, 'cl1', 'Clinical 1', 0
    UNION ALL
    SELECT 'CLINICAL'::session_types, 'cl2', 'Clinical 2', 0
    UNION ALL
    SELECT 'CLINICAL'::session_types, 'cl3', 'Clinical 3', 0
    UNION ALL
    SELECT 'CLINICAL'::session_types, 'cl4', 'Clinical 4', 0
    UNION ALL
    SELECT 'CLINICAL'::session_types, 'cl5', 'Clinical 5', 0
    UNION ALL
    SELECT 'CLINICAL'::session_types, 'cl6', 'Clinical 6', 0
    UNION ALL
    SELECT 'CLINICAL'::session_types, 'cl7', 'Clinical 7', 0
    UNION ALL
    SELECT 'CLINICAL'::session_types, 'cl8', 'Clinical 8', 0
    -- Data Follow Up sessions
    UNION ALL
    SELECT 'DATA_COLLECTION'::session_types, 'dfu1', 'Data Follow Up 1', 0
    UNION ALL
    SELECT 'DATA_COLLECTION'::session_types, 'dfu2', 'Data Follow Up 2', 0
    UNION ALL
    SELECT 'DATA_COLLECTION'::session_types, 'dfu3', 'Data Follow Up 3', 0
    UNION ALL
    SELECT 'DATA_COLLECTION'::session_types, 'dfu4', 'Data Follow Up 4', 0
    UNION ALL
    SELECT 'DATA_COLLECTION'::session_types, 'dfu5', 'Data Follow Up 5', 0
    UNION ALL
    SELECT 'DATA_COLLECTION'::session_types, 'dfu6', 'Data Follow Up 6', 0
) s
CROSS JOIN "hubs" h
WHERE h."project_id" = '2025_Project_1'
ON CONFLICT (hub_id, session_name) DO NOTHING; 