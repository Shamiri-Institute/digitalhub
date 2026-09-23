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

--
-- The rewrite cascades through foreign keys, and 43 of the child columns carry no index. Without
-- one, each parent row makes Postgres scan the whole child table: rewriting 9,142 intervention
-- groups would scan a 670 MB table 9,142 times, which is about 6 TB of reads. A first attempt on
-- production spent 41 minutes on that single statement and was cancelled.
--
-- So the indexes are built first and dropped at the end. They exist only for the rewrite. Keeping
-- any of them permanently is a separate decision, because every index costs on each write; the
-- missing-index note in docs/drizzle-migration/findings.md tracks that.

CREATE INDEX tmp_bf_attendance_documents_group_id ON "attendance_documents" ("group_id");--> statement-breakpoint
CREATE INDEX tmp_bf_attendance_documents_uploaded_by ON "attendance_documents" ("uploaded_by");--> statement-breakpoint
CREATE INDEX tmp_bf_clinical_case_notes_created_by ON "clinical_case_notes" ("created_by");--> statement-breakpoint
CREATE INDEX tmp_bf_clinical_case_notes_session_id ON "clinical_case_notes" ("session_id");--> statement-breakpoint
CREATE INDEX tmp_bf_clinical_case_termination_case_id ON "clinical_case_termination" ("case_id");--> statement-breakpoint
CREATE INDEX tmp_bf_clinical_case_termination_created_by ON "clinical_case_termination" ("created_by");--> statement-breakpoint
CREATE INDEX tmp_bf_clinical_case_termination_session_id ON "clinical_case_termination" ("session_id");--> statement-breakpoint
CREATE INDEX tmp_bf_clinical_screening_info_clinicalLeadId ON "clinical_screening_info" ("clinicalLeadId");--> statement-breakpoint
CREATE INDEX tmp_bf_clinical_screening_info_current_supervisor_id ON "clinical_screening_info" ("current_supervisor_id");--> statement-breakpoint
CREATE INDEX tmp_bf_clinical_screening_info_referredTo_supervisor_id ON "clinical_screening_info" ("referredTo_supervisor_id");--> statement-breakpoint
CREATE INDEX tmp_bf_clinical_screening_info_student_id ON "clinical_screening_info" ("student_id");--> statement-breakpoint
CREATE INDEX tmp_bf_clinical_session_attendance_caseId ON "clinical_session_attendance" ("caseId");--> statement-breakpoint
CREATE INDEX tmp_bf_fellow_attendances_fellow_id ON "fellow_attendances" ("fellow_id");--> statement-breakpoint
CREATE INDEX tmp_bf_fellow_attendances_group_id ON "fellow_attendances" ("group_id");--> statement-breakpoint
CREATE INDEX tmp_bf_fellow_attendances_marked_by ON "fellow_attendances" ("marked_by");--> statement-breakpoint
CREATE INDEX tmp_bf_fellow_attendances_project_id ON "fellow_attendances" ("project_id");--> statement-breakpoint
CREATE INDEX tmp_bf_fellow_attendances_school_id ON "fellow_attendances" ("school_id");--> statement-breakpoint
CREATE INDEX tmp_bf_fellow_attendances_supervisor_id ON "fellow_attendances" ("supervisor_id");--> statement-breakpoint
CREATE INDEX tmp_bf_intervention_group_reports_group_id ON "intervention_group_reports" ("group_id");--> statement-breakpoint
CREATE INDEX tmp_bf_intervention_session_ratings_supervisor_id ON "intervention_session_ratings" ("supervisor_id");--> statement-breakpoint
CREATE INDEX tmp_bf_intervention_sessions_hub_id ON "intervention_sessions" ("hub_id");--> statement-breakpoint
CREATE INDEX tmp_bf_intervention_sessions_project_id ON "intervention_sessions" ("project_id");--> statement-breakpoint
CREATE INDEX tmp_bf_intervention_sessions_session_id ON "intervention_sessions" ("session_id");--> statement-breakpoint
CREATE INDEX tmp_bf_payout_statements_confirmed_by ON "payout_statements" ("confirmed_by");--> statement-breakpoint
CREATE INDEX tmp_bf_payout_statements_created_by ON "payout_statements" ("created_by");--> statement-breakpoint
CREATE INDEX tmp_bf_payout_statements_fellow_id ON "payout_statements" ("fellow_id");--> statement-breakpoint
CREATE INDEX tmp_bf_payout_statements_special_payout_request_id ON "payout_statements" ("special_payout_request_id");--> statement-breakpoint
CREATE INDEX tmp_bf_session_recordings_group_id ON "session_recordings" ("group_id");--> statement-breakpoint
CREATE INDEX tmp_bf_session_recordings_school_id ON "session_recordings" ("school_id");--> statement-breakpoint
CREATE INDEX tmp_bf_session_recordings_uploaded_by ON "session_recordings" ("uploaded_by");--> statement-breakpoint
CREATE INDEX tmp_bf_student_attendances_fellow_id ON "student_attendances" ("fellow_id");--> statement-breakpoint
CREATE INDEX tmp_bf_student_attendances_group_id ON "student_attendances" ("group_id");--> statement-breakpoint
CREATE INDEX tmp_bf_student_attendances_marked_by ON "student_attendances" ("marked_by");--> statement-breakpoint
CREATE INDEX tmp_bf_student_attendances_project_id ON "student_attendances" ("project_id");--> statement-breakpoint
CREATE INDEX tmp_bf_student_attendances_school_id ON "student_attendances" ("school_id");--> statement-breakpoint
CREATE INDEX tmp_bf_students_fellow_id ON "students" ("fellow_id");--> statement-breakpoint
CREATE INDEX tmp_bf_students_implementer_id ON "students" ("implementer_id");--> statement-breakpoint
CREATE INDEX tmp_bf_students_supervisor_id ON "students" ("supervisor_id");--> statement-breakpoint
CREATE INDEX tmp_bf_supervisor_attendances_marked_by ON "supervisor_attendances" ("marked_by");--> statement-breakpoint
CREATE INDEX tmp_bf_supervisor_attendances_project_id ON "supervisor_attendances" ("project_id");--> statement-breakpoint
CREATE INDEX tmp_bf_supervisor_attendances_school_id ON "supervisor_attendances" ("school_id");--> statement-breakpoint
CREATE INDEX tmp_bf_supervisor_attendances_supervisor_id ON "supervisor_attendances" ("supervisor_id");--> statement-breakpoint
CREATE INDEX tmp_bf_weekly_fellow_ratings_supervisor_id ON "weekly_fellow_ratings" ("supervisor_id");--> statement-breakpoint

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

-- The indexes above existed only to make the cascade cheap.
DROP INDEX tmp_bf_attendance_documents_group_id;--> statement-breakpoint
DROP INDEX tmp_bf_attendance_documents_uploaded_by;--> statement-breakpoint
DROP INDEX tmp_bf_clinical_case_notes_created_by;--> statement-breakpoint
DROP INDEX tmp_bf_clinical_case_notes_session_id;--> statement-breakpoint
DROP INDEX tmp_bf_clinical_case_termination_case_id;--> statement-breakpoint
DROP INDEX tmp_bf_clinical_case_termination_created_by;--> statement-breakpoint
DROP INDEX tmp_bf_clinical_case_termination_session_id;--> statement-breakpoint
DROP INDEX tmp_bf_clinical_screening_info_clinicalLeadId;--> statement-breakpoint
DROP INDEX tmp_bf_clinical_screening_info_current_supervisor_id;--> statement-breakpoint
DROP INDEX tmp_bf_clinical_screening_info_referredTo_supervisor_id;--> statement-breakpoint
DROP INDEX tmp_bf_clinical_screening_info_student_id;--> statement-breakpoint
DROP INDEX tmp_bf_clinical_session_attendance_caseId;--> statement-breakpoint
DROP INDEX tmp_bf_fellow_attendances_fellow_id;--> statement-breakpoint
DROP INDEX tmp_bf_fellow_attendances_group_id;--> statement-breakpoint
DROP INDEX tmp_bf_fellow_attendances_marked_by;--> statement-breakpoint
DROP INDEX tmp_bf_fellow_attendances_project_id;--> statement-breakpoint
DROP INDEX tmp_bf_fellow_attendances_school_id;--> statement-breakpoint
DROP INDEX tmp_bf_fellow_attendances_supervisor_id;--> statement-breakpoint
DROP INDEX tmp_bf_intervention_group_reports_group_id;--> statement-breakpoint
DROP INDEX tmp_bf_intervention_session_ratings_supervisor_id;--> statement-breakpoint
DROP INDEX tmp_bf_intervention_sessions_hub_id;--> statement-breakpoint
DROP INDEX tmp_bf_intervention_sessions_project_id;--> statement-breakpoint
DROP INDEX tmp_bf_intervention_sessions_session_id;--> statement-breakpoint
DROP INDEX tmp_bf_payout_statements_confirmed_by;--> statement-breakpoint
DROP INDEX tmp_bf_payout_statements_created_by;--> statement-breakpoint
DROP INDEX tmp_bf_payout_statements_fellow_id;--> statement-breakpoint
DROP INDEX tmp_bf_payout_statements_special_payout_request_id;--> statement-breakpoint
DROP INDEX tmp_bf_session_recordings_group_id;--> statement-breakpoint
DROP INDEX tmp_bf_session_recordings_school_id;--> statement-breakpoint
DROP INDEX tmp_bf_session_recordings_uploaded_by;--> statement-breakpoint
DROP INDEX tmp_bf_student_attendances_fellow_id;--> statement-breakpoint
DROP INDEX tmp_bf_student_attendances_group_id;--> statement-breakpoint
DROP INDEX tmp_bf_student_attendances_marked_by;--> statement-breakpoint
DROP INDEX tmp_bf_student_attendances_project_id;--> statement-breakpoint
DROP INDEX tmp_bf_student_attendances_school_id;--> statement-breakpoint
DROP INDEX tmp_bf_students_fellow_id;--> statement-breakpoint
DROP INDEX tmp_bf_students_implementer_id;--> statement-breakpoint
DROP INDEX tmp_bf_students_supervisor_id;--> statement-breakpoint
DROP INDEX tmp_bf_supervisor_attendances_marked_by;--> statement-breakpoint
DROP INDEX tmp_bf_supervisor_attendances_project_id;--> statement-breakpoint
DROP INDEX tmp_bf_supervisor_attendances_school_id;--> statement-breakpoint
DROP INDEX tmp_bf_supervisor_attendances_supervisor_id;--> statement-breakpoint
DROP INDEX tmp_bf_weekly_fellow_ratings_supervisor_id;--> statement-breakpoint

DROP FUNCTION typeid_suffix(uuid);
