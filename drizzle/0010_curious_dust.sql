ALTER TABLE "clinical_case_transfer_trail" RENAME COLUMN "caseId" TO "case_id";--> statement-breakpoint
ALTER TABLE "clinical_expert_case_notes" RENAME COLUMN "caseId" TO "case_id";--> statement-breakpoint
ALTER TABLE "clinical_screening_info" RENAME COLUMN "referredTo_supervisor_id" TO "referred_to_supervisor_id";--> statement-breakpoint
ALTER TABLE "clinical_screening_info" RENAME COLUMN "clinicalLeadId" TO "clinical_lead_id";--> statement-breakpoint
ALTER TABLE "clinical_session_attendance" RENAME COLUMN "caseId" TO "case_id";--> statement-breakpoint
ALTER TABLE "clinical_session_attendance" RENAME COLUMN "clinicalLeadId" TO "clinical_lead_id";--> statement-breakpoint
ALTER TABLE "monthly_supervisor_evaluation" RENAME COLUMN "program_session_attendace" TO "program_session_attendance";--> statement-breakpoint
ALTER TABLE "school_feedbacks" RENAME COLUMN "schoolId" TO "school_id";--> statement-breakpoint
ALTER TABLE "session_names" RENAME COLUMN "sessionType" TO "session_type";--> statement-breakpoint
ALTER TABLE "student_reporting_notes" RENAME COLUMN "addedBy" TO "added_by";--> statement-breakpoint
ALTER TABLE "clinical_case_transfer_trail" DROP CONSTRAINT "clinical_case_transfer_trail_caseId_fkey";
--> statement-breakpoint
ALTER TABLE "clinical_expert_case_notes" DROP CONSTRAINT "clinical_expert_case_notes_caseId_fkey";
--> statement-breakpoint
ALTER TABLE "clinical_screening_info" DROP CONSTRAINT "clinical_screening_info_referredTo_supervisor_id_fkey";
--> statement-breakpoint
ALTER TABLE "clinical_screening_info" DROP CONSTRAINT "clinical_screening_info_clinicalLeadId_fkey";
--> statement-breakpoint
ALTER TABLE "clinical_session_attendance" DROP CONSTRAINT "clinical_session_attendance_caseId_fkey";
--> statement-breakpoint
ALTER TABLE "school_feedbacks" DROP CONSTRAINT "school_feedbacks_schoolId_fkey";
--> statement-breakpoint
ALTER TABLE "student_reporting_notes" DROP CONSTRAINT "student_reporting_notes_addedBy_fkey";
--> statement-breakpoint
ALTER TABLE "clinical_case_transfer_trail" ADD CONSTRAINT "clinical_case_transfer_trail_caseId_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."clinical_screening_info"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_expert_case_notes" ADD CONSTRAINT "clinical_expert_case_notes_caseId_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."clinical_screening_info"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_screening_info" ADD CONSTRAINT "clinical_screening_info_referredTo_supervisor_id_fkey" FOREIGN KEY ("referred_to_supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_screening_info" ADD CONSTRAINT "clinical_screening_info_clinicalLeadId_fkey" FOREIGN KEY ("clinical_lead_id") REFERENCES "public"."clinical_leads"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_session_attendance" ADD CONSTRAINT "clinical_session_attendance_caseId_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."clinical_screening_info"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "school_feedbacks" ADD CONSTRAINT "school_feedbacks_schoolId_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "student_reporting_notes" ADD CONSTRAINT "student_reporting_notes_addedBy_fkey" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;