-- The reopen window counts from `resolved_at`, so resolved tickets take it from their latest resolution,
-- or from their last update when no resolution was recorded, so none is left unable to reopen or close.
UPDATE tickets t
SET resolved_at = COALESCE(
  (SELECT max(e.created_at) FROM ticket_events e WHERE e.ticket_id = t.id AND e.kind = 'RESOLVED'),
  t.updated_at
)
WHERE t.status = 'RESOLVED'
  AND t.resolved_at IS NULL;
