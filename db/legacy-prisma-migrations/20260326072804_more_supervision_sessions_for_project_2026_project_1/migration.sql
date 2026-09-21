-- Add extra supervision session names for all hubs in 2026_Project_1
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
    'SUPERVISION'::session_types,
    s.session_name,
    s.session_label,
    h.id AS hub_id,
    'KES' AS currency,
    s.amount,
    CURRENT_TIMESTAMP AS created_at,
    CURRENT_TIMESTAMP AS updated_at
FROM (
    SELECT 'sv6' AS session_name, 'Supervision 6' AS session_label, 500 AS amount
    UNION ALL
    SELECT 'sv7', 'Supervision 7', 500
) s
CROSS JOIN "hubs" h
WHERE h."project_id" = '2026_Project_1'
  AND NOT EXISTS (
      SELECT 1
      FROM "session_names" sn
      WHERE sn."hub_id" = h.id
        AND sn."sessionType" = 'SUPERVISION'::session_types
        AND sn."session_name" = s.session_name
  );