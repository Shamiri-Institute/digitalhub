CREATE TYPE "public"."adaptation_types" AS ENUM('CONTENT', 'PACING', 'LANGUAGE', 'FORMAT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('PENDING', 'REJECTED', 'APPROVED');--> statement-breakpoint
CREATE TYPE "public"."caseStatusOptions" AS ENUM('Active', 'Terminated', 'FollowUp', 'Referred');--> statement-breakpoint
CREATE TYPE "public"."FollowUpPlanOptions" AS ENUM('GROUP', 'INDIVIDUAL');--> statement-breakpoint
CREATE TYPE "public"."GroupType" AS ENUM('TREATMENT', 'CONTROL');--> statement-breakpoint
CREATE TYPE "public"."implementer_roles" AS ENUM('ADMIN', 'HUB_COORDINATOR', 'SUPERVISOR', 'OPERATIONS', 'FELLOW', 'CLINICAL_LEAD', 'CLINICAL_TEAM');--> statement-breakpoint
CREATE TYPE "public"."questionnaire_types" AS ENUM('QA', 'JSS');--> statement-breakpoint
CREATE TYPE "public"."recording_processing_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."referralStatusOptions" AS ENUM('Approved', 'Declined', 'Pending');--> statement-breakpoint
CREATE TYPE "public"."risk_not_completed_reasons" AS ENUM('STUDENT_LEFT', 'NO_PRIVACY', 'TIME_CONSTRAINTS', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."risk_screen_outcomes" AS ENUM('ALL_NO', 'ANY_YES', 'NOT_COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."riskStatusOptions" AS ENUM('No', 'Low', 'Medium', 'High');--> statement-breakpoint
CREATE TYPE "public"."SessionStatus" AS ENUM('Scheduled', 'Rescheduled', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."session_types" AS ENUM('INTERVENTION', 'SUPERVISION', 'TRAINING', 'SPECIAL', 'CLINICAL', 'DATA_COLLECTION');--> statement-breakpoint
CREATE TYPE "public"."supervisor_handoff_statuses" AS ENUM('WARM_HANDOFF', 'SUPERVISOR_NOTIFIED', 'COULD_NOT_REACH', 'STUDENT_REFUSED_NOTIFIED');--> statement-breakpoint
CREATE TYPE "public"."support_types" AS ENUM('TRAINING', 'CHECK_INS', 'MATERIALS', 'PEER_SUPPORT', 'SUFFICIENT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."ticket_category" AS ENUM('TECH', 'RESEARCH', 'OPERATIONS', 'CARE', 'CLINICAL');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority_level" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('OPEN', 'ESCALATED', 'RESOLVED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."triage_action_taken" AS ENUM('SUPPORTED', 'REFERRED', 'ESCALATED', 'REFUSED', 'INTERRUPTED');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"group_id" varchar(255) NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"uploaded_by" varchar(255) NOT NULL,
	"link" varchar(255) NOT NULL,
	"archived_at" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "clinical_case_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"presenting_issues" text NOT NULL,
	"ors_assessment" integer NOT NULL,
	"risk_level" text NOT NULL,
	"necessary_conditions" text NOT NULL,
	"treatment_interventions" text[],
	"other_intervention" text NOT NULL,
	"intervention_explanation" text NOT NULL,
	"student_response_explanations" text NOT NULL,
	"follow_up_plan" "FollowUpPlanOptions" NOT NULL,
	"follow_up_plan_explanation" text NOT NULL,
	"case_id" text NOT NULL,
	"session_id" text NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinical_case_termination" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"termination_date" timestamp with time zone NOT NULL,
	"termination_reason" text NOT NULL,
	"termination_reason_explanation" text NOT NULL,
	"case_id" text NOT NULL,
	"session_id" text NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinical_case_transfer_trail" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"from" varchar(255) NOT NULL,
	"from_role" varchar(255) NOT NULL,
	"to" varchar(255) NOT NULL,
	"to_role" varchar(255) NOT NULL,
	"caseId" text NOT NULL,
	"referral_status" "referralStatusOptions"
);
--> statement-breakpoint
CREATE TABLE "clinical_expert_case_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"name" varchar(255) NOT NULL,
	"caseId" text NOT NULL,
	"comment" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinical_follow_up_treatment_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"current_ors_score" integer,
	"planned_sessions" integer NOT NULL,
	"session_frequency" text NOT NULL,
	"planned_treatment_intervention" text[],
	"other_treatment_intervention" text,
	"planned_treatment_intervention_explanation" text NOT NULL,
	"case_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinical_follow_up_treatment_plan_audit_trail" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"action" text NOT NULL,
	"user_id" text NOT NULL,
	"before_data" jsonb,
	"after_data" jsonb,
	"case_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinical_leads" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"clinical_lead_name" varchar(255) NOT NULL,
	"clinical_lead_email" varchar(255) NOT NULL,
	"county" varchar(255),
	"sub_county" varchar(255),
	"bank_name" varchar(255),
	"bank_branch" varchar(255),
	"bank_account_name" varchar(255),
	"bank_account_number" varchar(255),
	"kra" varchar(255),
	"nhif" varchar(255),
	"nssf" varchar(255),
	"date_of_birth" date,
	"gender" varchar(10),
	"training_level" varchar(255),
	"dropped_out" boolean,
	"assigned_hub_id" varchar(255) NOT NULL,
	"implementer_id" varchar(255) NOT NULL,
	"cell_number" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "clinical_screening_info" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"student_id" varchar(255) NOT NULL,
	"case_status" "caseStatusOptions" NOT NULL,
	"risk_status" "riskStatusOptions" NOT NULL,
	"school_id" varchar(255) NOT NULL,
	"current_supervisor_id" varchar(255),
	"referredTo_supervisor_id" varchar(255),
	"accept_case" boolean DEFAULT false NOT NULL,
	"general_presenting_issues" varchar(255),
	"general_presenting_issues_other_specified" text,
	"emergency_presenting_issues" json,
	"referred_from" varchar(255),
	"referred_from_specified" varchar(255),
	"referred_to" varchar(255),
	"referred_to_specified" varchar(255),
	"referral_notes" text,
	"progress_notes" varchar(255),
	"treatment_plan" varchar(255),
	"case_report" varchar(255),
	"flagged" boolean DEFAULT false NOT NULL,
	"initial_case_history_id" varchar(255),
	"initial_case_history_owner_id" varchar(255),
	"referral_status" "referralStatusOptions",
	"academic_struggles" boolean,
	"anxiety" boolean,
	"blended_family_dynamics" boolean,
	"flagged_reason" text,
	"home_environment" boolean,
	"medical_condition" boolean,
	"parent_child_relationships" boolean,
	"peer_relationships" boolean,
	"self_perception" boolean,
	"self_regulation" boolean,
	"sexuality" boolean,
	"student_teacher_relationships" boolean,
	"unresolved_grief_loss" boolean,
	"initial_referred_from" varchar(255),
	"initial_referred_from_specified" varchar(255),
	"non_suicidal_self_injury" boolean,
	"referral_reason" text,
	"pseudonym" varchar(255),
	"session_when_case_is_flagged_id" varchar(255),
	"emergency_presenting_issues_baseline" json,
	"emergency_presenting_issues_endpoint" json,
	"general_presenting_issues_baseline" json,
	"general_presenting_issues_endpoint" json,
	"general_presenting_issues_other_specified_baseline" text,
	"general_presenting_issues_other_specified_endpoint" text,
	"clinicalLeadId" text
);
--> statement-breakpoint
CREATE TABLE "clinical_session_attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"supervisor_id" varchar(255),
	"session" varchar(255) NOT NULL,
	"caseId" text NOT NULL,
	"attendance_status" boolean,
	"clinicalLeadId" text
);
--> statement-breakpoint
CREATE TABLE "clinical_teams" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"cell_number" varchar(255),
	"assigned_hub_id" varchar(255),
	"implementer_id" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delayed_payment_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"fellow_id" varchar(255) NOT NULL,
	"supervisor_id" varchar(255) NOT NULL,
	"intervention_session_id" varchar(255) NOT NULL,
	"fellow_attendance_id" integer NOT NULL,
	"fulfilled_at" timestamp with time zone,
	"rejected_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "fellows" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"archived_at" timestamp (3),
	"visible_id" varchar(100),
	"fellow_name" varchar(255),
	"fellow_email" varchar(255),
	"year_of_implementation" integer,
	"mpesa_name" varchar(255),
	"mpesa_number" varchar(255),
	"id_number" varchar(255),
	"cell_number" varchar(255),
	"county" varchar(255),
	"sub_county" varchar(255),
	"date_of_birth" date,
	"gender" text,
	"transferred" boolean,
	"hub_id" varchar(255),
	"implementer_id" varchar(255),
	"supervisor_id" varchar(255),
	"dropped_out" boolean,
	"drop_out_reason" text,
	"dropped_out_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "fellow_attendances" (
	"id" serial PRIMARY KEY NOT NULL,
	"visible_id" varchar(100),
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"fellow_id" varchar(255) NOT NULL,
	"session_number" integer,
	"session_date" timestamp (3),
	"year_of_implementation" integer,
	"school_id" varchar(255),
	"supervisor_id" varchar(255),
	"attended" boolean,
	"absence_reason" text,
	"payment_initiated" boolean,
	"group_id" varchar(255),
	"project_id" text,
	"session_id" text,
	"processed_at" timestamp (3),
	"absence_comments" text,
	"marked_by" text
);
--> statement-breakpoint
CREATE TABLE "fellow_complaints" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"complaint" text NOT NULL,
	"supervisor_id" varchar(255),
	"fellow_id" varchar(255) NOT NULL,
	"comments" text,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "fellow_group_reports" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"fellow_id" varchar(255) NOT NULL,
	"group_id" varchar(255) NOT NULL,
	"project_id" varchar(100) NOT NULL,
	"structural_fidelity" integer NOT NULL,
	"process_fidelity" integer NOT NULL,
	"adaptations_made" boolean NOT NULL,
	"adaptation_type" "adaptation_types",
	"adaptation_reason" varchar(500),
	"behavioral_engagement" integer NOT NULL,
	"reflective_engagement" integer NOT NULL,
	"psychological_safety" integer NOT NULL,
	"group_cohesion" integer NOT NULL,
	"climate_concerns" boolean NOT NULL,
	"climate_concerns_detail" varchar(500),
	"skill_comprehension" integer NOT NULL,
	"in_session_transfer" integer NOT NULL,
	"home_practice_applicable" boolean NOT NULL,
	"home_practice_engagement" integer,
	"fellow_group_relationship" integer NOT NULL,
	"external_disruptions" boolean NOT NULL,
	"external_disruptions_detail" varchar(500),
	"facilitator_confidence" integer NOT NULL,
	"hardest_aspect" varchar(500) NOT NULL,
	"challenge_impact" integer NOT NULL,
	"what_went_well" varchar(500) NOT NULL,
	"support_type" "support_types" NOT NULL,
	"support_detail" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "fellow_payment_complaints" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"date_of_complaint" timestamp with time zone,
	"reason" varchar(255) NOT NULL,
	"statement" varchar(255) NOT NULL,
	"confirmed_amount_received" integer,
	"difference_in_amount" integer,
	"status" "approval_status" DEFAULT 'PENDING' NOT NULL,
	"comments" text,
	"reason_for_rejection" text,
	"reason_for_acceptance" text,
	"fellow_attendance_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fellow_reporting_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"supervisor_id" varchar(255) NOT NULL,
	"fellow_id" varchar(255) NOT NULL,
	"notes" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"archived_at" timestamp (3),
	"key" text NOT NULL,
	"file_name" text NOT NULL,
	"byte_size" integer NOT NULL,
	"content_type" text NOT NULL,
	"width" integer,
	"height" integer,
	"signed_url" varchar(2048),
	"expires_at" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "hubs" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"archived_at" timestamp (3),
	"visible_id" varchar(100) NOT NULL,
	"hub_name" varchar(255) NOT NULL,
	"implementer_id" varchar(255) NOT NULL,
	"project_id" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "hub_coordinators" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"archived_at" timestamp (3),
	"visible_id" varchar(100) NOT NULL,
	"coordinator_name" varchar(255) NOT NULL,
	"coordinator_email" varchar(255),
	"id_number" varchar(255),
	"cell_number" varchar(255),
	"mpesa_number" varchar(255),
	"implementer_id" varchar(255) NOT NULL,
	"county" varchar(255),
	"sub_county" varchar(255),
	"bank_name" varchar(255),
	"bank_branch" varchar(255),
	"bank_account_number" varchar(255),
	"bank_account_name" varchar(255),
	"kra" varchar(255),
	"nhif" varchar(255),
	"date_of_birth" date,
	"gender" varchar(10),
	"training_level" varchar(255),
	"dropped_out" boolean,
	"assigned_hub_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "implementers" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"archived_at" timestamp (3),
	"visible_id" varchar(100) NOT NULL,
	"implementer_name" text NOT NULL,
	"implementer_type" text NOT NULL,
	"implementer_address" text,
	"county_of_operation" text,
	"point_person_name" text,
	"point_person_phone" text,
	"point_person_email" text,
	CONSTRAINT "implementers_visible_id_key" UNIQUE("visible_id")
);
--> statement-breakpoint
CREATE TABLE "implementer_avatars" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"implementer_id" text NOT NULL,
	"file_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "implementer_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"implementer_id" varchar(255) NOT NULL,
	"sent_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expires_at" timestamp (3) NOT NULL,
	"accepted_at" timestamp (3),
	"secure_token" text NOT NULL,
	"implementer_role" "implementer_roles" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "implementer_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"implementer_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"identifier" varchar(255),
	"role" "implementer_roles" NOT NULL,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "intervention_groups" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"archived_at" timestamp (3),
	"group_name" varchar(100) NOT NULL,
	"leader_id" varchar(255) NOT NULL,
	"school_id" text NOT NULL,
	"project_id" varchar(100) NOT NULL,
	"group_type" "GroupType" DEFAULT 'TREATMENT' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intervention_group_reports" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"group_id" varchar(255) NOT NULL,
	"engagement_1" integer,
	"engagement_2" integer,
	"engagement_3" integer,
	"engagement_comment" text,
	"cooperation_1" integer,
	"cooperation_2" integer,
	"cooperation_3" integer,
	"cooperation_comment" text,
	"content" integer,
	"content_comment" text,
	"intervention_session_id" text,
	"is_all_report" boolean
);
--> statement-breakpoint
CREATE TABLE "intervention_sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"archived_at" timestamp (3),
	"session_name" varchar(255),
	"session_type" varchar(255),
	"school_id" varchar(255),
	"occurred" boolean NOT NULL,
	"year_of_implementation" integer NOT NULL,
	"project_id" varchar(100),
	"schedule_history" jsonb,
	"session_end_time" timestamp (3),
	"status" "SessionStatus" DEFAULT 'Scheduled',
	"session_id" varchar(255),
	"venue" text,
	"session_date" timestamp (6) with time zone NOT NULL,
	"hub_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "intervention_session_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"archived_at" timestamp (3),
	"session_id" varchar(255) NOT NULL,
	"kind" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"supervisor_id" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intervention_session_ratings" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"archived_at" timestamp (3),
	"session_id" varchar(255) NOT NULL,
	"supervisor_id" varchar(255) NOT NULL,
	"student_behavior_rating" integer,
	"admin_support_rating" integer,
	"workload_rating" integer,
	"challenges" text,
	"positive_highlights" text,
	"recommendations" text,
	"headcount" integer
);
--> statement-breakpoint
CREATE TABLE "monthly_supervisor_evaluation" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"project_id" text NOT NULL,
	"supervisor_id" varchar(255) NOT NULL,
	"hub_coordinator_id" varchar(255) NOT NULL,
	"month" date NOT NULL,
	"respectfulness" integer NOT NULL,
	"attitude" integer NOT NULL,
	"collaboration" integer NOT NULL,
	"reliability" integer NOT NULL,
	"identification_of_issues" integer NOT NULL,
	"leadership" integer NOT NULL,
	"communication_style" integer NOT NULL,
	"conflict_resolution" integer NOT NULL,
	"adaptability" integer NOT NULL,
	"recognition_and_feedback" integer NOT NULL,
	"decision_making" integer NOT NULL,
	"fellow_recruitment_effectiveness" integer NOT NULL,
	"fellow_training_effectiveness" integer NOT NULL,
	"program_logistics_coordination" integer NOT NULL,
	"program_session_attendace" integer NOT NULL,
	"management_style_comments" text,
	"workplace_demeanor_comments" text,
	"program_execution_comments" text
);
--> statement-breakpoint
CREATE TABLE "ops_users" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"gender" varchar(10),
	"cell_phone" varchar(255),
	"dropped_out" boolean,
	"implementer_id" varchar(255) NOT NULL,
	"assigned_hub_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "overall_fellow_evaluations" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"archived_at" timestamp with time zone,
	"supervisor_id" varchar(255) NOT NULL,
	"fellow_id" varchar(255) NOT NULL,
	"fellow_behaviour_notes" text NOT NULL,
	"program_delivery_notes" text NOT NULL,
	"dressing_and_grooming_notes" text NOT NULL,
	"punctuality_notes" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_reconciliations" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"executed_at" timestamp with time zone,
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'KES' NOT NULL,
	"description" text,
	"fellow_id" text NOT NULL,
	"related_details" jsonb
);
--> statement-breakpoint
CREATE TABLE "payout_statements" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"fellow_attendance_id" integer NOT NULL,
	"fellow_id" varchar(255) NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"notes" text,
	"created_by" text NOT NULL,
	"executed_at" timestamp with time zone,
	"mpesa_number" text,
	"special_payout_request_id" text,
	"confirmed_at" timestamp with time zone,
	"confirmed_by" text
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"visible_id" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"project_lead" varchar(255),
	"funder" varchar(255),
	"budget" integer,
	"phase" integer,
	"estimated_start_date" date,
	"estimated_end_date" date,
	"actual_start_date" date,
	"actual_end_date" date,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_implementers" (
	"implementer_id" varchar(255) NOT NULL,
	"project_id" varchar(255) NOT NULL,
	CONSTRAINT "project_implementers_pkey" PRIMARY KEY("project_id","implementer_id")
);
--> statement-breakpoint
CREATE TABLE "reimbursement_requests" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"archived_at" timestamp (3),
	"kind" varchar(255) NOT NULL,
	"status" varchar(100) DEFAULT 'pending' NOT NULL,
	"details" jsonb NOT NULL,
	"hub_id" varchar(255) NOT NULL,
	"supervisor_id" varchar(255) NOT NULL,
	"incurred_at" timestamp with time zone NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'KES' NOT NULL,
	"hub_coordinator_id" varchar(255),
	"mpesa_name" varchar(255) NOT NULL,
	"mpesa_number" varchar(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repayment_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"supervisor_id" varchar(255) NOT NULL,
	"fellow_id" varchar(255) NOT NULL,
	"hub_id" varchar(255) NOT NULL,
	"fellow_attendance_id" integer NOT NULL,
	"fulfilled_at" timestamp with time zone,
	"rejected_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"archived_at" timestamp (3),
	"school_name" varchar(255) NOT NULL,
	"school_type" varchar(255),
	"school_email" varchar(255),
	"school_county" varchar(255),
	"school_demographics" varchar(255),
	"visible_id" varchar(100) NOT NULL,
	"implementer_id" varchar(255),
	"hub_id" varchar(255),
	"point_person_name" varchar(255),
	"point_person_id" varchar(255),
	"point_person_phone" varchar(255),
	"point_person_email" varchar(255),
	"numbers_expected" integer,
	"boarding_day" varchar(255),
	"longitude" double precision,
	"latitude" double precision,
	"dropped_out" boolean,
	"pre_session_date" timestamp (3),
	"session_1_date" timestamp (3),
	"session_2_date" timestamp (3),
	"session_3_date" timestamp (3),
	"session_4_date" timestamp (3),
	"clinical_followup_1_date" timestamp (3),
	"clinical_followup_2_date" timestamp (3),
	"clinical_followup_3_date" timestamp (3),
	"clinical_followup_4_date" timestamp (3),
	"clinical_followup_5_date" timestamp (3),
	"clinical_followup_6_date" timestamp (3),
	"clinical_followup_7_date" timestamp (3),
	"clinical_followup_8_date" timestamp (3),
	"data_collection_followup_1_date" timestamp (3),
	"dropout_reason" text,
	"principal_name" text,
	"principal_phone" text,
	"assigned_supervisor_id" varchar(255),
	"school_sub_county" varchar(255),
	"dropped_out_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "school_dropout_history" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"dropped_out" boolean NOT NULL,
	"dropout_reason" text,
	"user_id" text NOT NULL,
	"school_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_feedbacks" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"student_teacher_satisfaction_rating" integer,
	"factors_influenced_student_participation" text,
	"concerns_raised_by_teachers" text,
	"program_impact_on_students" text,
	"schoolId" varchar(255),
	"user_id" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"session_token" text NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"content" text NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"session_id" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_names" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"sessionType" "session_types" NOT NULL,
	"session_name" varchar(255) NOT NULL,
	"amount" integer,
	"currency" varchar(100) DEFAULT 'KES' NOT NULL,
	"hub_id" varchar(255) NOT NULL,
	"session_label" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_recordings" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"archived_at" timestamp with time zone,
	"file_name" varchar(255) NOT NULL,
	"original_file_name" varchar(255) NOT NULL,
	"s3_key" varchar(500) NOT NULL,
	"content_type" varchar(100) NOT NULL,
	"file_size" integer NOT NULL,
	"fellow_id" varchar(255) NOT NULL,
	"school_id" varchar(255) NOT NULL,
	"group_id" varchar(255) NOT NULL,
	"intervention_session_id" varchar(255) NOT NULL,
	"uploaded_by" text NOT NULL,
	"supervisor_id" varchar(255) NOT NULL,
	"status" "recording_processing_status" DEFAULT 'PENDING' NOT NULL,
	"processed_at" timestamp with time zone,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"fidelity_feedback" jsonb,
	"overall_score" varchar(50),
	"fidelity_job_id" varchar(255),
	"fidelity_job_submitted_at" timestamp with time zone,
	"transcript" jsonb,
	"prompt_version" integer
);
--> statement-breakpoint
CREATE TABLE "special_session_approval_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"amount" integer NOT NULL,
	"created_by" text NOT NULL,
	"fellow_attendance_id" integer NOT NULL,
	"status" "approval_status" DEFAULT 'PENDING' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"archived_at" timestamp (3),
	"student_name" varchar(255),
	"visible_id" varchar(100) NOT NULL,
	"fellow_id" varchar(255),
	"supervisor_id" varchar(255),
	"implementer_id" varchar(255),
	"school_id" varchar(255),
	"year_of_implementation" integer,
	"admission_number" varchar(255),
	"age" integer,
	"gender" varchar(10),
	"form" integer,
	"stream" varchar(255),
	"condition" varchar(255),
	"intervention" varchar(255),
	"tribe" varchar(255),
	"county" varchar(255),
	"financial_status" varchar(255),
	"home" varchar(255),
	"siblings" varchar(255),
	"religion" varchar(255),
	"group_name" varchar(255),
	"surviving_parents" varchar(255),
	"parents_dead" varchar(255),
	"fathers_education" varchar(255),
	"mothers_education" varchar(255),
	"co_curricular" varchar(255),
	"sports" varchar(255),
	"is_clinical_case" boolean,
	"phone_number" varchar(255),
	"mpesa_number" varchar(255),
	"dropped_out" boolean,
	"drop_out_reason" text,
	"dropped_out_at" timestamp with time zone,
	"assigned_group_id" text,
	"year_of_birth" integer,
	"questionnaire_type" "questionnaire_types",
	CONSTRAINT "students_visible_id_key" UNIQUE("visible_id")
);
--> statement-breakpoint
CREATE TABLE "student_attendances" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"project_id" text NOT NULL,
	"student_id" varchar(255) NOT NULL,
	"school_id" varchar(255),
	"fellow_id" varchar(255),
	"attended" boolean,
	"absence_reason" text,
	"session_id" text NOT NULL,
	"group_id" varchar(255),
	"comments" text,
	"marked_by" text
);
--> statement-breakpoint
CREATE TABLE "student_group_transfer_trail" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"student_id" text NOT NULL,
	"current_group_id" text NOT NULL,
	"from_group_id" text
);
--> statement-breakpoint
CREATE TABLE "student_outcomes" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"shamiri_id" text,
	"time_point" integer NOT NULL,
	"year_of_implementation" integer NOT NULL,
	"date" date,
	"condition" text NOT NULL,
	"implementer_id" text,
	"phq_1" integer,
	"phq_2" integer,
	"phq_3" integer,
	"phq_4" integer,
	"phq_5" integer,
	"phq_6" integer,
	"phq_7" integer,
	"phq_8" integer,
	"phq_functioning" integer,
	"gad_1" integer,
	"gad_2" integer,
	"gad_3" integer,
	"gad_4" integer,
	"gad_5" integer,
	"gad_6" integer,
	"gad_7" integer,
	"gad_functioning" integer,
	"mspss_1" integer,
	"mspss_2" integer,
	"mspss_3" integer,
	"mspss_4" integer,
	"mspss_5" integer,
	"mspss_6" integer,
	"mspss_7" integer,
	"mspss_8" integer,
	"mspss_9" integer,
	"mspss_10" integer,
	"mspss_11" integer,
	"mspss_12" integer,
	"gq_1" integer,
	"gq_2" integer,
	"gq_3" integer,
	"gq_4" integer,
	"gq_5" integer,
	"gq_6" integer,
	"pcs_1" integer,
	"pcs_2" integer,
	"pcs_3" integer,
	"pcs_4" integer,
	"pcs_5" integer,
	"pcs_6" integer,
	"pcs_7" integer,
	"pcs_8" integer,
	"pcs_9" integer,
	"pcs_10" integer,
	"pcs_11" integer,
	"pcs_12" integer,
	"pcs_13" integer,
	"pcs_14" integer,
	"pcs_15" integer,
	"pcs_16" integer,
	"pcs_17" integer,
	"pcs_18" integer,
	"pcs_19" integer,
	"pcs_20" integer,
	"pcs_21" integer,
	"pcs_22" integer,
	"pcs_23" integer,
	"pcs_24" integer,
	"pcr_3" integer,
	"pcr_5" integer,
	"pcr_6" integer,
	"pcr_8" integer,
	"pcr_10" integer,
	"pcr_12" integer,
	"pcr_13" integer,
	"pcr_16" integer,
	"pcr_17" integer,
	"pcr_19" integer,
	"pcr_21" integer,
	"pcr_23" integer,
	"personality_q1" integer,
	"personality_q2" integer,
	"personality_q3" integer,
	"personality_q4" integer,
	"personality_q5" integer,
	"personality_rq1" integer,
	"personality_rq4" integer,
	"swemwbs_1" integer,
	"swemwbs_2" integer,
	"swemwbs_3" integer,
	"swemwbs_4" integer,
	"swemwbs_5" integer,
	"swemwbs_6" integer,
	"swemwbs_7" integer,
	"pils_1" integer,
	"pils_2" integer,
	"pils_3" integer,
	"pils_4" integer,
	"pils_5" integer,
	"pils_6" integer,
	"pils_7" integer,
	"pils_8" integer,
	"pils_9" integer,
	"pils_10" integer,
	"pils_11" integer,
	"pils_12" integer,
	"epoch_e1" integer,
	"epoch_e2" integer,
	"epoch_e3" integer,
	"epoch_e4" integer,
	"epoch_p1" integer,
	"epoch_p2" integer,
	"epoch_p3" integer,
	"epoch_p4" integer,
	"epoch_o1" integer,
	"epoch_o2" integer,
	"epoch_o3" integer,
	"epoch_o4" integer,
	"epoch_c1" integer,
	"epoch_c2" integer,
	"epoch_c3" integer,
	"epoch_c4" integer,
	"epoch_h1" integer,
	"epoch_h2" integer,
	"epoch_h3" integer,
	"epoch_h4" integer,
	"ucla_1" integer,
	"ucla_2" integer,
	"ucla_3" integer,
	"ucla_4" integer,
	"ucla_5" integer,
	"ucla_6" integer,
	"ucla_7" integer,
	"ucla_8" integer,
	"pcsc_1" integer,
	"pcsc_2" integer,
	"pcsc_3" integer,
	"pcsc_4" integer,
	"pcsc_5" integer,
	"pcsc_6" integer,
	"pcsc_7" integer,
	"pcsc_8" integer,
	"scs_1" integer,
	"scs_2" integer,
	"scs_3" integer,
	"scs_4" integer,
	"scs_5" integer,
	"scs_6" integer,
	"sps_1" integer,
	"sps_2" integer,
	"sps_3" integer,
	"sps_4" integer,
	"sps_5" integer,
	"sps_6" integer,
	"sps_7" integer,
	"sps_8" integer,
	"sps_9" integer,
	"sps_10" integer,
	"sps_11" integer,
	"sps_12" integer,
	"iptq_1" integer,
	"iptq_2" integer,
	"iptq_3" integer,
	"moc_1" integer,
	"moc_2" integer,
	"moc_3" integer,
	"moc_4" integer,
	"moc_5" integer,
	"moc_6" integer,
	"moc_7" integer,
	"moc_8" integer,
	"moc_9" integer,
	"moc_10" integer,
	"fb1_accept" integer,
	"fb2_feas" integer
);
--> statement-breakpoint
CREATE TABLE "student_reporting_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"supervisor_id" varchar(255),
	"student_id" varchar(255) NOT NULL,
	"notes" text NOT NULL,
	"addedBy" text
);
--> statement-breakpoint
CREATE TABLE "supervisors" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"archived_at" timestamp (3),
	"hub_id" varchar(255),
	"visible_id" varchar(100),
	"supervisor_name" varchar(255),
	"supervisor_email" varchar(255),
	"id_number" varchar(255),
	"cell_number" varchar(255),
	"mpesa_number" varchar(20),
	"implementer_id" varchar(255) NOT NULL,
	"county" varchar(255),
	"sub_county" varchar(255),
	"bank_name" varchar(255),
	"bank_branch" varchar(255),
	"bank_account_name" varchar(255),
	"bank_account_number" varchar(255),
	"kra" varchar(255),
	"nhif" varchar(255),
	"nssf" varchar(255),
	"date_of_birth" date,
	"gender" varchar(10),
	"training_level" varchar(255),
	"dropped_out" boolean,
	"mpesa_name" varchar(255),
	"personal_email" varchar(255),
	"drop_out_reason" text
);
--> statement-breakpoint
CREATE TABLE "supervisor_attendances" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"project_id" text NOT NULL,
	"school_id" varchar(255),
	"supervisor_id" varchar(255) NOT NULL,
	"attended" boolean,
	"absence_reason" text,
	"absence_comments" text,
	"session_id" text NOT NULL,
	"marked_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supervisor_complaints" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"project_id" text NOT NULL,
	"supervisor_id" varchar(255) NOT NULL,
	"absence_reason" text NOT NULL,
	"absence_comments" text,
	"hub_coordinator_id" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_escalations" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" varchar(255) NOT NULL,
	"escalated_by" varchar(255) NOT NULL,
	"escalated_to" varchar(255) NOT NULL,
	"escalation_reason" text NOT NULL,
	"archived_at" timestamp (3),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_reassignments" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" varchar(255) NOT NULL,
	"escalation_id" varchar(255) NOT NULL,
	"reassigned_from" varchar(255) NOT NULL,
	"reassigned_to" varchar(255) NOT NULL,
	"reassignment_reason" text NOT NULL,
	"archived_at" timestamp (3),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_resolutions" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" varchar(255) NOT NULL,
	"resolved_by" varchar(255) NOT NULL,
	"resolution_reason" text NOT NULL,
	"archived_at" timestamp (3),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "ticket_resolutions_ticket_id_key" UNIQUE("ticket_id")
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"visible_id" serial NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"subject" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"priority" "ticket_priority_level" DEFAULT 'MEDIUM' NOT NULL,
	"category" "ticket_category" NOT NULL,
	"status" "ticket_status" DEFAULT 'OPEN' NOT NULL,
	"archived_at" timestamp (3),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "triage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"student_attendance_id" integer,
	"session_id" varchar(255) NOT NULL,
	"student_id" varchar(255) NOT NULL,
	"fellow_id" varchar(255) NOT NULL,
	"hub_id" varchar(255),
	"triage_occurred" boolean NOT NULL,
	"risk_screen_outcome" "risk_screen_outcomes",
	"risk_not_completed_reason" "risk_not_completed_reasons",
	"action_taken" "triage_action_taken",
	"referred_supervisor_id" varchar(255),
	"supervisor_handoff_status" "supervisor_handoff_statuses",
	"note" varchar(500),
	"metadata" jsonb,
	"review_note" varchar(300),
	"reviewed_at" timestamp with time zone,
	"reviewed_by_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "triage_event_audits" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"triage_event_id" varchar(255) NOT NULL,
	"edited_by_id" varchar(255) NOT NULL,
	"before_data" jsonb,
	"after_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"archived_at" timestamp (3),
	"name" text,
	"email" text,
	"email_verified" timestamp (3),
	"image" text,
	"active_project_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "user_avatars" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"file_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_recent_opens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"item_id" text NOT NULL,
	"opened_at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_fellow_ratings" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"behaviour_notes" text NOT NULL,
	"program_delivery_notes" text NOT NULL,
	"dressing_and_grooming_notes" text NOT NULL,
	"punctuality_notes" text NOT NULL,
	"fellow_id" varchar(255) NOT NULL,
	"supervisor_id" text NOT NULL,
	"week" date NOT NULL,
	"behaviour_rating" integer,
	"dressing_and_grooming_rating" integer,
	"program_delivery_rating" integer,
	"punctuality_rating" integer
);
--> statement-breakpoint
CREATE TABLE "weekly_hub_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"recommendations" text NOT NULL,
	"week" date NOT NULL,
	"submitted_by" varchar(255) NOT NULL,
	"hub_id" varchar(255) NOT NULL,
	"challenges" text NOT NULL,
	"fellow_related_issues_and_observations" text NOT NULL,
	"fellow_related_issues_and_observations_rating" integer NOT NULL,
	"hub_related_issues_and_observations" text NOT NULL,
	"hub_related_issues_and_observations_rating" integer NOT NULL,
	"school_related_issues_and_observations" text NOT NULL,
	"school_related_issues_and_observations_rating" integer NOT NULL,
	"successes" text NOT NULL,
	"supervisor_related_issues_and_observations" text NOT NULL,
	"supervisor_related_issues_and_observations_rating" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_team_meeting_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"logistics_related_issues" text NOT NULL,
	"logistics_related_issues_rating" integer NOT NULL,
	"relationship_management" text NOT NULL,
	"relationship_management_rating" integer NOT NULL,
	"digital_hub_issues" text NOT NULL,
	"digital_hub_issues_rating" integer NOT NULL,
	"any_other_challenges" text NOT NULL,
	"any_other_challenges_rating" integer NOT NULL,
	"recommendations" text NOT NULL,
	"week" date NOT NULL,
	"submitted_by" varchar(255) NOT NULL,
	"hub_id" varchar(255) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "attendance_documents" ADD CONSTRAINT "attendance_documents_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."intervention_groups"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "attendance_documents" ADD CONSTRAINT "attendance_documents_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."intervention_sessions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "attendance_documents" ADD CONSTRAINT "attendance_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_case_notes" ADD CONSTRAINT "clinical_case_notes_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."clinical_screening_info"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_case_notes" ADD CONSTRAINT "clinical_case_notes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."clinical_session_attendance"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_case_notes" ADD CONSTRAINT "clinical_case_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_case_termination" ADD CONSTRAINT "clinical_case_termination_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."clinical_screening_info"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_case_termination" ADD CONSTRAINT "clinical_case_termination_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."clinical_session_attendance"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_case_termination" ADD CONSTRAINT "clinical_case_termination_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_case_transfer_trail" ADD CONSTRAINT "clinical_case_transfer_trail_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."clinical_screening_info"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_expert_case_notes" ADD CONSTRAINT "clinical_expert_case_notes_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."clinical_screening_info"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_follow_up_treatment_plan" ADD CONSTRAINT "clinical_follow_up_treatment_plan_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."clinical_screening_info"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_follow_up_treatment_plan_audit_trail" ADD CONSTRAINT "clinical_follow_up_treatment_plan_audit_trail_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_follow_up_treatment_plan_audit_trail" ADD CONSTRAINT "clinical_follow_up_treatment_plan_audit_trail_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."clinical_screening_info"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_leads" ADD CONSTRAINT "clinical_leads_assigned_hub_id_fkey" FOREIGN KEY ("assigned_hub_id") REFERENCES "public"."hubs"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_leads" ADD CONSTRAINT "clinical_leads_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "public"."implementers"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_screening_info" ADD CONSTRAINT "clinical_screening_info_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_screening_info" ADD CONSTRAINT "clinical_screening_info_referredTo_supervisor_id_fkey" FOREIGN KEY ("referredTo_supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_screening_info" ADD CONSTRAINT "clinical_screening_info_session_when_case_is_flagged_id_fkey" FOREIGN KEY ("session_when_case_is_flagged_id") REFERENCES "public"."intervention_sessions"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_screening_info" ADD CONSTRAINT "clinical_screening_info_clinicalLeadId_fkey" FOREIGN KEY ("clinicalLeadId") REFERENCES "public"."clinical_leads"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_screening_info" ADD CONSTRAINT "clinical_screening_info_current_supervisor_id_fkey" FOREIGN KEY ("current_supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_session_attendance" ADD CONSTRAINT "clinical_session_attendance_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."clinical_screening_info"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_teams" ADD CONSTRAINT "clinical_teams_assigned_hub_id_fkey" FOREIGN KEY ("assigned_hub_id") REFERENCES "public"."hubs"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clinical_teams" ADD CONSTRAINT "clinical_teams_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "public"."implementers"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "delayed_payment_requests" ADD CONSTRAINT "delayed_payment_requests_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "public"."fellows"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "delayed_payment_requests" ADD CONSTRAINT "delayed_payment_requests_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "delayed_payment_requests" ADD CONSTRAINT "delayed_payment_requests_intervention_session_id_fkey" FOREIGN KEY ("intervention_session_id") REFERENCES "public"."intervention_sessions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "delayed_payment_requests" ADD CONSTRAINT "delayed_payment_requests_fellow_attendance_id_fkey" FOREIGN KEY ("fellow_attendance_id") REFERENCES "public"."fellow_attendances"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "fellows" ADD CONSTRAINT "fellows_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "fellows" ADD CONSTRAINT "fellows_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "public"."implementers"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "fellows" ADD CONSTRAINT "fellows_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "fellow_attendances" ADD CONSTRAINT "fellow_attendances_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "public"."fellows"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "fellow_attendances" ADD CONSTRAINT "fellow_attendances_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "fellow_attendances" ADD CONSTRAINT "fellow_attendances_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."intervention_sessions"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "fellow_attendances" ADD CONSTRAINT "fellow_attendances_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."intervention_groups"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "fellow_attendances" ADD CONSTRAINT "fellow_attendances_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "fellow_attendances" ADD CONSTRAINT "fellow_attendances_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "fellow_attendances" ADD CONSTRAINT "fellow_attendances_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "fellow_complaints" ADD CONSTRAINT "fellow_complaints_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "public"."fellows"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "fellow_complaints" ADD CONSTRAINT "fellow_complaints_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "fellow_complaints" ADD CONSTRAINT "fellow_complaints_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "fellow_group_reports" ADD CONSTRAINT "fellow_group_reports_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "public"."fellows"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "fellow_group_reports" ADD CONSTRAINT "fellow_group_reports_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."intervention_groups"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "fellow_group_reports" ADD CONSTRAINT "fellow_group_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "fellow_payment_complaints" ADD CONSTRAINT "fellow_payment_complaints_fellow_attendance_id_fkey" FOREIGN KEY ("fellow_attendance_id") REFERENCES "public"."fellow_attendances"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "fellow_reporting_notes" ADD CONSTRAINT "fellow_reporting_notes_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "fellow_reporting_notes" ADD CONSTRAINT "fellow_reporting_notes_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "public"."fellows"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hubs" ADD CONSTRAINT "hubs_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "public"."implementers"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hubs" ADD CONSTRAINT "hubs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hub_coordinators" ADD CONSTRAINT "hub_coordinators_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "public"."implementers"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hub_coordinators" ADD CONSTRAINT "hub_coordinators_assigned_hub_id_fkey" FOREIGN KEY ("assigned_hub_id") REFERENCES "public"."hubs"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "implementer_avatars" ADD CONSTRAINT "implementer_avatars_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "public"."implementers"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "implementer_avatars" ADD CONSTRAINT "implementer_avatars_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "implementer_invites" ADD CONSTRAINT "implementer_invites_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "public"."implementers"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "implementer_members" ADD CONSTRAINT "implementer_members_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "public"."implementers"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "implementer_members" ADD CONSTRAINT "implementer_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "intervention_groups" ADD CONSTRAINT "intervention_groups_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "intervention_groups" ADD CONSTRAINT "intervention_groups_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "public"."fellows"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "intervention_groups" ADD CONSTRAINT "intervention_groups_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "intervention_group_reports" ADD CONSTRAINT "intervention_group_reports_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."intervention_groups"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "intervention_group_reports" ADD CONSTRAINT "intervention_group_reports_intervention_session_id_fkey" FOREIGN KEY ("intervention_session_id") REFERENCES "public"."intervention_sessions"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "intervention_sessions" ADD CONSTRAINT "intervention_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "intervention_sessions" ADD CONSTRAINT "intervention_sessions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."session_names"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "intervention_sessions" ADD CONSTRAINT "intervention_sessions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "intervention_sessions" ADD CONSTRAINT "intervention_sessions_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "intervention_session_notes" ADD CONSTRAINT "intervention_session_notes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."intervention_sessions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "intervention_session_notes" ADD CONSTRAINT "intervention_session_notes_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "intervention_session_ratings" ADD CONSTRAINT "intervention_session_ratings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."intervention_sessions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "intervention_session_ratings" ADD CONSTRAINT "intervention_session_ratings_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "monthly_supervisor_evaluation" ADD CONSTRAINT "monthly_supervisor_evaluation_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "monthly_supervisor_evaluation" ADD CONSTRAINT "monthly_supervisor_evaluation_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "monthly_supervisor_evaluation" ADD CONSTRAINT "monthly_supervisor_evaluation_hub_coordinator_id_fkey" FOREIGN KEY ("hub_coordinator_id") REFERENCES "public"."hub_coordinators"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ops_users" ADD CONSTRAINT "ops_users_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "public"."implementers"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ops_users" ADD CONSTRAINT "ops_users_assigned_hub_id_fkey" FOREIGN KEY ("assigned_hub_id") REFERENCES "public"."hubs"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "overall_fellow_evaluations" ADD CONSTRAINT "overall_fellow_evaluations_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "overall_fellow_evaluations" ADD CONSTRAINT "overall_fellow_evaluations_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "public"."fellows"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payout_reconciliations" ADD CONSTRAINT "payout_reconciliations_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "public"."fellows"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payout_statements" ADD CONSTRAINT "payout_statements_fellow_attendance_id_fkey" FOREIGN KEY ("fellow_attendance_id") REFERENCES "public"."fellow_attendances"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payout_statements" ADD CONSTRAINT "payout_statements_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "public"."fellows"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payout_statements" ADD CONSTRAINT "payout_statements_special_payout_request_id_fkey" FOREIGN KEY ("special_payout_request_id") REFERENCES "public"."special_session_approval_requests"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payout_statements" ADD CONSTRAINT "payout_statements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payout_statements" ADD CONSTRAINT "payout_statements_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "project_implementers" ADD CONSTRAINT "project_implementers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "project_implementers" ADD CONSTRAINT "project_implementers_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "public"."implementers"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_hub_coordinator_id_fkey" FOREIGN KEY ("hub_coordinator_id") REFERENCES "public"."hub_coordinators"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "repayment_requests" ADD CONSTRAINT "repayment_requests_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "repayment_requests" ADD CONSTRAINT "repayment_requests_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "public"."fellows"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "repayment_requests" ADD CONSTRAINT "repayment_requests_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "repayment_requests" ADD CONSTRAINT "repayment_requests_fellow_attendance_id_fkey" FOREIGN KEY ("fellow_attendance_id") REFERENCES "public"."fellow_attendances"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "public"."implementers"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_assigned_supervisor_id_fkey" FOREIGN KEY ("assigned_supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "school_dropout_history" ADD CONSTRAINT "school_dropout_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "school_dropout_history" ADD CONSTRAINT "school_dropout_history_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "school_feedbacks" ADD CONSTRAINT "school_feedbacks_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "school_feedbacks" ADD CONSTRAINT "school_feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session_comments" ADD CONSTRAINT "session_comments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."intervention_sessions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session_comments" ADD CONSTRAINT "session_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session_names" ADD CONSTRAINT "session_names_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session_recordings" ADD CONSTRAINT "session_recordings_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "public"."fellows"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session_recordings" ADD CONSTRAINT "session_recordings_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session_recordings" ADD CONSTRAINT "session_recordings_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."intervention_groups"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session_recordings" ADD CONSTRAINT "session_recordings_intervention_session_id_fkey" FOREIGN KEY ("intervention_session_id") REFERENCES "public"."intervention_sessions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session_recordings" ADD CONSTRAINT "session_recordings_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session_recordings" ADD CONSTRAINT "session_recordings_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "special_session_approval_requests" ADD CONSTRAINT "special_session_approval_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."hub_coordinators"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "special_session_approval_requests" ADD CONSTRAINT "special_session_approval_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."supervisors"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "special_session_approval_requests" ADD CONSTRAINT "special_session_approval_requests_fellow_attendance_id_fkey" FOREIGN KEY ("fellow_attendance_id") REFERENCES "public"."fellow_attendances"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "public"."fellows"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "public"."implementers"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_assigned_group_id_fkey" FOREIGN KEY ("assigned_group_id") REFERENCES "public"."intervention_groups"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."intervention_sessions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."intervention_groups"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "public"."fellows"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "student_group_transfer_trail" ADD CONSTRAINT "student_group_transfer_trail_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "student_group_transfer_trail" ADD CONSTRAINT "student_group_transfer_trail_from_group_id_fkey" FOREIGN KEY ("from_group_id") REFERENCES "public"."intervention_groups"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "student_outcomes" ADD CONSTRAINT "student_outcomes_shamiri_id_fkey" FOREIGN KEY ("shamiri_id") REFERENCES "public"."students"("visible_id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "student_outcomes" ADD CONSTRAINT "student_outcomes_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "public"."implementers"("visible_id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "student_reporting_notes" ADD CONSTRAINT "student_reporting_notes_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "student_reporting_notes" ADD CONSTRAINT "student_reporting_notes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "student_reporting_notes" ADD CONSTRAINT "student_reporting_notes_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "supervisors" ADD CONSTRAINT "supervisors_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "supervisors" ADD CONSTRAINT "supervisors_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "public"."implementers"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "supervisor_attendances" ADD CONSTRAINT "supervisor_attendances_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "supervisor_attendances" ADD CONSTRAINT "supervisor_attendances_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "supervisor_attendances" ADD CONSTRAINT "supervisor_attendances_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."intervention_sessions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "supervisor_attendances" ADD CONSTRAINT "supervisor_attendances_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "supervisor_attendances" ADD CONSTRAINT "supervisor_attendances_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "supervisor_complaints" ADD CONSTRAINT "supervisor_complaints_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "supervisor_complaints" ADD CONSTRAINT "supervisor_complaints_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "supervisor_complaints" ADD CONSTRAINT "supervisor_complaints_hub_coordinator_id_fkey" FOREIGN KEY ("hub_coordinator_id") REFERENCES "public"."hub_coordinators"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ticket_escalations" ADD CONSTRAINT "ticket_escalations_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ticket_escalations" ADD CONSTRAINT "ticket_escalations_escalated_by_fkey" FOREIGN KEY ("escalated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ticket_escalations" ADD CONSTRAINT "ticket_escalations_escalated_to_fkey" FOREIGN KEY ("escalated_to") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ticket_reassignments" ADD CONSTRAINT "ticket_reassignments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ticket_reassignments" ADD CONSTRAINT "ticket_reassignments_escalation_id_fkey" FOREIGN KEY ("escalation_id") REFERENCES "public"."ticket_escalations"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ticket_reassignments" ADD CONSTRAINT "ticket_reassignments_reassigned_from_fkey" FOREIGN KEY ("reassigned_from") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ticket_reassignments" ADD CONSTRAINT "ticket_reassignments_reassigned_to_fkey" FOREIGN KEY ("reassigned_to") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ticket_resolutions" ADD CONSTRAINT "ticket_resolutions_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ticket_resolutions" ADD CONSTRAINT "ticket_resolutions_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "triage_events" ADD CONSTRAINT "triage_events_student_attendance_id_fkey" FOREIGN KEY ("student_attendance_id") REFERENCES "public"."student_attendances"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "triage_events" ADD CONSTRAINT "triage_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."intervention_sessions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "triage_events" ADD CONSTRAINT "triage_events_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "triage_events" ADD CONSTRAINT "triage_events_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "public"."fellows"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "triage_events" ADD CONSTRAINT "triage_events_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "triage_events" ADD CONSTRAINT "triage_events_referred_supervisor_id_fkey" FOREIGN KEY ("referred_supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "triage_events" ADD CONSTRAINT "triage_events_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "triage_event_audits" ADD CONSTRAINT "triage_event_audits_triage_event_id_fkey" FOREIGN KEY ("triage_event_id") REFERENCES "public"."triage_events"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "triage_event_audits" ADD CONSTRAINT "triage_event_audits_edited_by_id_fkey" FOREIGN KEY ("edited_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_active_project_id_fkey" FOREIGN KEY ("active_project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_avatars" ADD CONSTRAINT "user_avatars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_avatars" ADD CONSTRAINT "user_avatars_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_recent_opens" ADD CONSTRAINT "user_recent_opens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "weekly_fellow_ratings" ADD CONSTRAINT "weekly_fellow_ratings_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "public"."fellows"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "weekly_fellow_ratings" ADD CONSTRAINT "weekly_fellow_ratings_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "weekly_hub_reports" ADD CONSTRAINT "weekly_hub_reports_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "public"."hub_coordinators"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "weekly_hub_reports" ADD CONSTRAINT "weekly_hub_reports_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "weekly_team_meeting_reports" ADD CONSTRAINT "weekly_team_meeting_reports_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "public"."hub_coordinators"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "weekly_team_meeting_reports" ADD CONSTRAINT "weekly_team_meeting_reports_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "clinical_case_notes_case_id_session_id_key" ON "clinical_case_notes" USING btree ("case_id","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clinical_follow_up_treatment_plan_case_id_key" ON "clinical_follow_up_treatment_plan" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "fellows_hub_id_idx" ON "fellows" USING btree ("hub_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fellow_attendances_visible_id_key" ON "fellow_attendances" USING btree ("visible_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fellow_group_reports_fellow_id_group_id_key" ON "fellow_group_reports" USING btree ("fellow_id","group_id");--> statement-breakpoint
CREATE INDEX "fellow_group_reports_group_id_idx" ON "fellow_group_reports" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "fellow_group_reports_project_id_idx" ON "fellow_group_reports" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hubs_visible_id_key" ON "hubs" USING btree ("visible_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hub_coordinators_coordinator_email_key" ON "hub_coordinators" USING btree ("coordinator_email");--> statement-breakpoint
CREATE UNIQUE INDEX "hub_coordinators_visible_id_key" ON "hub_coordinators" USING btree ("visible_id");--> statement-breakpoint
CREATE UNIQUE INDEX "implementer_avatars_file_id_key" ON "implementer_avatars" USING btree ("file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "implementer_avatars_implementer_id_key" ON "implementer_avatars" USING btree ("implementer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "implementer_invites_email_implementer_id_secure_token_key" ON "implementer_invites" USING btree ("email","implementer_id","secure_token");--> statement-breakpoint
CREATE UNIQUE INDEX "intervention_groups_leader_id_school_id_key" ON "intervention_groups" USING btree ("leader_id","school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "intervention_group_reports_intervention_session_id_group_id_key" ON "intervention_group_reports" USING btree ("intervention_session_id","group_id");--> statement-breakpoint
CREATE INDEX "intervention_sessions_school_id_idx" ON "intervention_sessions" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "intervention_session_ratings_session_id_supervisor_id_key" ON "intervention_session_ratings" USING btree ("session_id","supervisor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "monthly_supervisor_evaluation_project_id_month_supervisor_i_key" ON "monthly_supervisor_evaluation" USING btree ("project_id","month","supervisor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_visible_id_key" ON "projects" USING btree ("visible_id");--> statement-breakpoint
CREATE UNIQUE INDEX "schools_visible_id_key" ON "schools" USING btree ("visible_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions" USING btree ("session_token");--> statement-breakpoint
CREATE UNIQUE INDEX "session_recordings_fellow_id_school_id_group_id_interventio_key" ON "session_recordings" USING btree ("fellow_id","school_id","group_id","intervention_session_id");--> statement-breakpoint
CREATE INDEX "session_recordings_status_idx" ON "session_recordings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "session_recordings_supervisor_id_idx" ON "session_recordings" USING btree ("supervisor_id");--> statement-breakpoint
CREATE INDEX "students_assigned_group_id_idx" ON "students" USING btree ("assigned_group_id");--> statement-breakpoint
CREATE INDEX "students_school_id_idx" ON "students" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "student_attendances_session_id_idx" ON "student_attendances" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_attendances_student_id_session_id_key" ON "student_attendances" USING btree ("student_id","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "supervisors_visible_id_key" ON "supervisors" USING btree ("visible_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_reassignments_escalation_id_key" ON "ticket_reassignments" USING btree ("escalation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_visible_id_key" ON "tickets" USING btree ("visible_id");--> statement-breakpoint
CREATE UNIQUE INDEX "triage_events_student_attendance_id_key" ON "triage_events" USING btree ("student_attendance_id");--> statement-breakpoint
CREATE UNIQUE INDEX "triage_events_student_id_session_id_key" ON "triage_events" USING btree ("student_id","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "user_avatars_file_id_key" ON "user_avatars" USING btree ("file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_avatars_user_id_key" ON "user_avatars" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_recent_opens_user_id_item_id_idx" ON "user_recent_opens" USING btree ("user_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens" USING btree ("identifier","token");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_fellow_ratings_fellow_id_supervisor_id_week_key" ON "weekly_fellow_ratings" USING btree ("fellow_id","supervisor_id","week");