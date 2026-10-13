ALTER TABLE "payout_statements" DROP CONSTRAINT "payout_statements_special_payout_request_id_fkey";--> statement-breakpoint
ALTER TABLE "implementer_avatars" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "implementer_invites" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_implementers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "special_session_approval_requests" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_avatars" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_recent_opens" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "implementer_avatars" CASCADE;--> statement-breakpoint
DROP TABLE "implementer_invites" CASCADE;--> statement-breakpoint
DROP TABLE "project_implementers" CASCADE;--> statement-breakpoint
DROP TABLE "special_session_approval_requests" CASCADE;--> statement-breakpoint
DROP TABLE "user_avatars" CASCADE;--> statement-breakpoint
DROP TABLE "user_recent_opens" CASCADE;
