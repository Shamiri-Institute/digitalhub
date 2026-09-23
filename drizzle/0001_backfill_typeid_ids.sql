-- Rewrites every primary key that is not a prefixed TypeID, so that all ids carry a uuidv7.
--
-- Rows created under Prisma hold a cuid, and rows created between the Drizzle cutover and
-- ENG-2164 hold a uuid version 4. Neither is time-ordered, which is what a uuidv7 fixes.
--
-- Every foreign key in this database is ON UPDATE CASCADE, all 170 of them, so updating a parent
-- id rewrites each child reference in the same statement. Only the owning table is touched here.
--
-- The new id is built from the row's own created_at, through uuidv7's interval shift, so the
-- timestamp inside the uuid stays true and the ids keep sorting in creation order.
--
-- A table is listed once, with the prefix its own rows already use. Tables whose rows are all
-- TypeIDs already are left out; each statement is a no-op on a freshly seeded database.

CREATE FUNCTION typeid_suffix(u uuid) RETURNS text AS $$
DECLARE
  hex text := replace(u::text, '-', '');
  n numeric := 0;
  i int;
  result text := '';
  alphabet constant text := '0123456789abcdefghjkmnpqrstvwxyz';
BEGIN
  FOR i IN 1..32 LOOP
    n := n * 16 + ('x' || substr(hex, i, 1))::bit(4)::int;
  END LOOP;
  FOR i IN 1..26 LOOP
    result := substr(alphabet, (n % 32)::int + 1, 1) || result;
    n := div(n, 32);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
--> statement-breakpoint

UPDATE "accounts" SET id = 'account_' || typeid_suffix(uuidv7()) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "sessions" SET id = 'authsession_' || typeid_suffix(uuidv7()) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "users" SET id = 'user_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "admin_users" SET id = 'admin_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "ops_users" SET id = 'opsuser_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "clinical_leads" SET id = 'clinicallead_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "clinical_teams" SET id = 'clinicalteam_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "projects" SET id = 'proj_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "implementers" SET id = 'impl_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "hubs" SET id = 'hub_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "hub_coordinators" SET id = 'coord_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "schools" SET id = 'sch_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "supervisors" SET id = 'sup_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "fellows" SET id = 'fellow_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "students" SET id = 'stu_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "student_outcomes" SET id = 'outcome_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "intervention_groups" SET id = 'group_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "session_recordings" SET id = 'rec_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "session_names" SET id = 'sessionname_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "session_comments" SET id = 'sessioncomment_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "special_session_approval_requests" SET id = 'approval_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "attendance_documents" SET id = 'attendancedoc_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "student_reporting_notes" SET id = 'studentnote_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "student_group_transfer_trail" SET id = 'grouptransfer_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "fellow_reporting_notes" SET id = 'fellownote_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "fellow_complaints" SET id = 'fellowcomplaint_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "fellow_payment_complaints" SET id = 'paycomplaint_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "overall_fellow_evaluations" SET id = 'fellowevaluation_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "weekly_fellow_ratings" SET id = 'fellowrating_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "supervisor_attendances" SET id = 'supattendance_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "supervisor_complaints" SET id = 'supcomplaint_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "monthly_supervisor_evaluation" SET id = 'supevaluation_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "weekly_hub_reports" SET id = 'hubreport_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "weekly_team_meeting_reports" SET id = 'teammeeting_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "school_dropout_history" SET id = 'schooldropout_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "school_feedbacks" SET id = 'feedback_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "clinical_screening_info" SET id = 'case_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "clinical_case_notes" SET id = 'casenote_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "clinical_expert_case_notes" SET id = 'expertnote_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "clinical_case_termination" SET id = 'casetermination_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "clinical_case_transfer_trail" SET id = 'casetransfer_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "clinical_session_attendance" SET id = 'csess_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "clinical_follow_up_treatment_plan" SET id = 'treatmentplan_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "clinical_follow_up_treatment_plan_audit_trail" SET id = 'treatmentaudit_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "triage_events" SET id = 'triage_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "triage_event_audits" SET id = 'triageaudit_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "tickets" SET id = 'ticket_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "ticket_escalations" SET id = 'escalation_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "ticket_resolutions" SET id = 'resolution_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "ticket_reassignments" SET id = 'reassignment_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "payout_statements" SET id = 'payout_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "repayment_requests" SET id = 'repayment_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint
UPDATE "delayed_payment_requests" SET id = 'delayedpayment_' || typeid_suffix(uuidv7(coalesce(created_at, now()) - now())) WHERE id !~ '^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$';--> statement-breakpoint

DROP FUNCTION typeid_suffix(uuid);
