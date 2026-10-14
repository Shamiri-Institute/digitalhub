SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
ALTER TABLE "payout_statements" DROP CONSTRAINT "payout_statements_fellow_id_fkey";
--> statement-breakpoint
CREATE INDEX "payout_statements_fellow_attendance_id_idx" ON "payout_statements" USING btree ("fellow_attendance_id");--> statement-breakpoint
ALTER TABLE "payout_statements" DROP COLUMN "fellow_id";
