-- CreateEnum
CREATE TYPE "caseStatusOptions" AS ENUM ('Active', 'Terminated', 'FollowUp', 'Referred');

-- CreateEnum
CREATE TYPE "riskStatusOptions" AS ENUM ('No', 'Low', 'Medium', 'High');

-- CreateTable
CREATE TABLE "clinical_screening_info" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "student_id" VARCHAR(255) NOT NULL,
    "case_status" "caseStatusOptions" NOT NULL,
    "risk_status" "riskStatusOptions" NOT NULL,
    "school_id" VARCHAR(255) NOT NULL,
    "current_supervisor_id" VARCHAR(255) NOT NULL,
    "referredTo_supervisor_id" VARCHAR(255),
    "accept_case" BOOLEAN NOT NULL DEFAULT false,
    "general_presenting_issues" VARCHAR(255),
    "general_presenting_issues_other_specified" TEXT,
    "emergency_presenting_issues" JSON,
    "referred_from" VARCHAR(255),
    "referred_from_specified" VARCHAR(255),
    "referred_to" VARCHAR(255),
    "referred_to_specified" VARCHAR(255),
    "referral_notes" TEXT,
    "progress_notes" VARCHAR(255),
    "treatment_plan" VARCHAR(255),
    "case_report" VARCHAR(255),
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "initial_case_history_id" VARCHAR(255),
    "initial_case_history_owner_id" VARCHAR(255),

    CONSTRAINT "clinical_screening_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_case_transfer_history" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "from" VARCHAR(255) NOT NULL,
    "from_role" VARCHAR(255) NOT NULL,
    "to" VARCHAR(255) NOT NULL,
    "to_role" VARCHAR(255) NOT NULL,
    "caseId" TEXT NOT NULL,

    CONSTRAINT "clinical_case_transfer_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_expert_case_notes" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR(255) NOT NULL,
    "commment" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,

    CONSTRAINT "clinical_expert_case_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_session_attendance" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supervisor_id" VARCHAR(255) NOT NULL,
    "session" VARCHAR(255) NOT NULL,
    "caseId" TEXT NOT NULL,

    CONSTRAINT "clinical_session_attendance_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "clinical_screening_info" ADD CONSTRAINT "clinical_screening_info_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_screening_info" ADD CONSTRAINT "clinical_screening_info_current_supervisor_id_fkey" FOREIGN KEY ("current_supervisor_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_screening_info" ADD CONSTRAINT "clinical_screening_info_referredTo_supervisor_id_fkey" FOREIGN KEY ("referredTo_supervisor_id") REFERENCES "supervisors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_case_transfer_history" ADD CONSTRAINT "clinical_case_transfer_history_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "clinical_screening_info"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_expert_case_notes" ADD CONSTRAINT "clinical_expert_case_notes_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "clinical_screening_info"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_session_attendance" ADD CONSTRAINT "clinical_session_attendance_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "clinical_screening_info"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
