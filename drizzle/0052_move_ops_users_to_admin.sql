-- Moves operations staff into admin as the OPERATIONS team. Production leaves `dropped_out` null,
-- so an ops user is active unless it is true.
--
-- Nothing here touches `implementer_members.updated_at`: the most recently updated membership is
-- the person's active one, so a converted membership stays active.

UPDATE admin_users a
SET team = 'OPERATIONS'
FROM ops_users o
WHERE o.dropped_out IS NOT TRUE
  AND o.implementer_id = a.implementer_id
  AND lower(trim(o.email)) = lower(trim(a.email))
  AND a.team IS NULL;--> statement-breakpoint

-- The id has the shape of the ones the app makes, as in 0013.
INSERT INTO admin_users (id, email, name, implementer_id, team, updated_at)
SELECT DISTINCT ON (o.implementer_id, lower(trim(o.email)))
  'admin_0' || substr(md5(random()::text || clock_timestamp()::text || o.id), 1, 25),
  lower(trim(o.email)),
  o.name,
  o.implementer_id,
  'OPERATIONS',
  CURRENT_TIMESTAMP
FROM ops_users o
JOIN implementer_members m ON m.role = 'OPERATIONS' AND m.identifier = o.id
WHERE o.dropped_out IS NOT TRUE
  AND NOT EXISTS (
    SELECT 1 FROM admin_users a
    WHERE a.implementer_id = o.implementer_id AND lower(trim(a.email)) = lower(trim(o.email))
  )
ORDER BY o.implementer_id, lower(trim(o.email)), o.id;--> statement-breakpoint

UPDATE implementer_members m
SET role = 'ADMIN', identifier = a.id
FROM ops_users o, admin_users a
WHERE m.role = 'OPERATIONS'
  AND m.identifier = o.id
  AND o.dropped_out IS NOT TRUE
  AND a.implementer_id = o.implementer_id
  AND lower(trim(a.email)) = lower(trim(o.email))
  AND NOT EXISTS (
    SELECT 1 FROM implementer_members x
    WHERE x.role = 'ADMIN' AND x.user_id = m.user_id AND x.implementer_id = m.implementer_id
  );--> statement-breakpoint

DELETE FROM implementer_members WHERE role = 'OPERATIONS';
