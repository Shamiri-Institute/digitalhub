-- Keep the user with a membership, then a sign-in account, then the newest; move the others' rows to it.
CREATE TEMP TABLE "duplicate_users" ON COMMIT DROP AS
SELECT ranked."id" AS "drop_id", ranked."keep_id"
FROM (
  SELECT u."id", first_value(u."id") OVER (
    PARTITION BY lower(trim(u."email"))
    ORDER BY
      EXISTS (SELECT 1 FROM "implementer_members" m WHERE m."user_id" = u."id") DESC,
      EXISTS (SELECT 1 FROM "accounts" a WHERE a."user_id" = u."id") DESC,
      u."created_at" DESC,
      u."id"
  ) AS "keep_id"
  FROM "users" u
  WHERE u."email" IS NOT NULL
) ranked
WHERE ranked."id" <> ranked."keep_id";
--> statement-breakpoint
UPDATE accounts SET user_id = m."keep_id" FROM "duplicate_users" AS m WHERE accounts.user_id = m."drop_id";
--> statement-breakpoint
UPDATE attendance_documents SET uploaded_by = m."keep_id" FROM "duplicate_users" AS m WHERE attendance_documents.uploaded_by = m."drop_id";
--> statement-breakpoint
UPDATE clinical_case_notes SET created_by = m."keep_id" FROM "duplicate_users" AS m WHERE clinical_case_notes.created_by = m."drop_id";
--> statement-breakpoint
UPDATE clinical_case_termination SET created_by = m."keep_id" FROM "duplicate_users" AS m WHERE clinical_case_termination.created_by = m."drop_id";
--> statement-breakpoint
UPDATE clinical_follow_up_treatment_plan_audit_trail SET user_id = m."keep_id" FROM "duplicate_users" AS m WHERE clinical_follow_up_treatment_plan_audit_trail.user_id = m."drop_id";
--> statement-breakpoint
UPDATE fellow_attendances SET marked_by = m."keep_id" FROM "duplicate_users" AS m WHERE fellow_attendances.marked_by = m."drop_id";
--> statement-breakpoint
UPDATE fellow_complaints SET created_by = m."keep_id" FROM "duplicate_users" AS m WHERE fellow_complaints.created_by = m."drop_id";
--> statement-breakpoint
UPDATE implementer_members SET user_id = m."keep_id" FROM "duplicate_users" AS m WHERE implementer_members.user_id = m."drop_id";
--> statement-breakpoint
UPDATE payout_statements SET confirmed_by = m."keep_id" FROM "duplicate_users" AS m WHERE payout_statements.confirmed_by = m."drop_id";
--> statement-breakpoint
UPDATE payout_statements SET created_by = m."keep_id" FROM "duplicate_users" AS m WHERE payout_statements.created_by = m."drop_id";
--> statement-breakpoint
UPDATE school_dropout_history SET user_id = m."keep_id" FROM "duplicate_users" AS m WHERE school_dropout_history.user_id = m."drop_id";
--> statement-breakpoint
UPDATE school_feedbacks SET user_id = m."keep_id" FROM "duplicate_users" AS m WHERE school_feedbacks.user_id = m."drop_id";
--> statement-breakpoint
UPDATE session_comments SET user_id = m."keep_id" FROM "duplicate_users" AS m WHERE session_comments.user_id = m."drop_id";
--> statement-breakpoint
UPDATE session_recordings SET uploaded_by = m."keep_id" FROM "duplicate_users" AS m WHERE session_recordings.uploaded_by = m."drop_id";
--> statement-breakpoint
UPDATE sessions SET user_id = m."keep_id" FROM "duplicate_users" AS m WHERE sessions.user_id = m."drop_id";
--> statement-breakpoint
UPDATE student_attendances SET marked_by = m."keep_id" FROM "duplicate_users" AS m WHERE student_attendances.marked_by = m."drop_id";
--> statement-breakpoint
UPDATE student_reporting_notes SET added_by = m."keep_id" FROM "duplicate_users" AS m WHERE student_reporting_notes.added_by = m."drop_id";
--> statement-breakpoint
UPDATE supervisor_attendances SET marked_by = m."keep_id" FROM "duplicate_users" AS m WHERE supervisor_attendances.marked_by = m."drop_id";
--> statement-breakpoint
UPDATE ticket_escalations SET escalated_by = m."keep_id" FROM "duplicate_users" AS m WHERE ticket_escalations.escalated_by = m."drop_id";
--> statement-breakpoint
UPDATE ticket_escalations SET escalated_to = m."keep_id" FROM "duplicate_users" AS m WHERE ticket_escalations.escalated_to = m."drop_id";
--> statement-breakpoint
UPDATE ticket_reassignments SET reassigned_from = m."keep_id" FROM "duplicate_users" AS m WHERE ticket_reassignments.reassigned_from = m."drop_id";
--> statement-breakpoint
UPDATE ticket_reassignments SET reassigned_to = m."keep_id" FROM "duplicate_users" AS m WHERE ticket_reassignments.reassigned_to = m."drop_id";
--> statement-breakpoint
UPDATE ticket_resolutions SET resolved_by = m."keep_id" FROM "duplicate_users" AS m WHERE ticket_resolutions.resolved_by = m."drop_id";
--> statement-breakpoint
UPDATE tickets SET created_by = m."keep_id" FROM "duplicate_users" AS m WHERE tickets.created_by = m."drop_id";
--> statement-breakpoint
UPDATE triage_event_audits SET edited_by_id = m."keep_id" FROM "duplicate_users" AS m WHERE triage_event_audits.edited_by_id = m."drop_id";
--> statement-breakpoint
UPDATE triage_events SET reviewed_by_id = m."keep_id" FROM "duplicate_users" AS m WHERE triage_events.reviewed_by_id = m."drop_id";
--> statement-breakpoint
DELETE FROM "users" USING "duplicate_users" AS m WHERE "users"."id" = m."drop_id";
--> statement-breakpoint
UPDATE "users" SET "email" = lower(trim("email")) WHERE "email" <> lower(trim("email"));
--> statement-breakpoint
CREATE UNIQUE INDEX "users_lower_email_key" ON "users" USING btree (lower("email"));
