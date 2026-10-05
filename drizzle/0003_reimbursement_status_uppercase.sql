-- Legacy rows (Nov 2023 - Jan 2024) were written as lower-case 'pending'; the app reads upper case.
UPDATE "reimbursement_requests" SET "status" = upper("status") WHERE "status" <> upper("status");--> statement-breakpoint
ALTER TABLE "reimbursement_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_status_check" CHECK ("reimbursement_requests"."status" IN ('PENDING', 'APPROVED', 'REJECTED'));