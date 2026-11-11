SET LOCAL lock_timeout = '5s';--> statement-breakpoint
ALTER TABLE "ticket_escalations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ticket_reassignments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ticket_resolutions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "ticket_escalations" CASCADE;--> statement-breakpoint
DROP TABLE "ticket_reassignments" CASCADE;--> statement-breakpoint
DROP TABLE "ticket_resolutions" CASCADE;--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "holder_id" SET NOT NULL;