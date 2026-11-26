-- Unfinished uploads from before stuck_after existed. A QUEUED one never notified is made due, so
-- the first notification run sends it; each gets a deadline from now. UPLOADED ones get none until
-- a run queues them.
UPDATE "survey_uploads" SET "notify_next_at" = now()
WHERE "status" = 'QUEUED' AND "notified_at" IS NULL AND "notify_next_at" IS NULL;--> statement-breakpoint
UPDATE "survey_uploads" SET "stuck_after" = now() + interval '10 minutes'
WHERE "status" = 'QUEUED';--> statement-breakpoint
UPDATE "survey_uploads" SET "stuck_after" = now() + interval '15 minutes'
WHERE "status" = 'PROCESSING';
