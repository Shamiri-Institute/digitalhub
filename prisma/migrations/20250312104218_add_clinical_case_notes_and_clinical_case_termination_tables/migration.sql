-- CreateEnum
CREATE TYPE "FollowUpPlanOptions" AS ENUM ('GROUP', 'INDIVIDUAL');

-- CreateTable
CREATE TABLE "clinical_case_notes" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "presenting_issues" TEXT NOT NULL,
    "ors_assessment" INTEGER NOT NULL,
    "risk_level" TEXT NOT NULL,
    "necessary_conditions" TEXT NOT NULL,
    "treatment_interventions" TEXT[],
    "other_intervention" TEXT NOT NULL,
    "intervention_explanation" TEXT NOT NULL,
    "emotional_response" TEXT NOT NULL,
    "behavioral_response" TEXT NOT NULL,
    "overall_feedback" TEXT NOT NULL,
    "student_response_explanations" TEXT NOT NULL,
    "follow_up_plan" "FollowUpPlanOptions" NOT NULL,
    "follow_up_plan_explanation" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "clinical_case_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_case_termination" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "termination_date" TIMESTAMPTZ NOT NULL,
    "termination_reason" TEXT NOT NULL,
    "termination_reason_explanation" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "clinical_case_termination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinical_case_notes_case_id_session_id_key" ON "clinical_case_notes"("case_id", "session_id");

-- AddForeignKey
ALTER TABLE "clinical_case_notes" ADD CONSTRAINT "clinical_case_notes_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "clinical_screening_info"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_case_notes" ADD CONSTRAINT "clinical_case_notes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "clinical_session_attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_case_notes" ADD CONSTRAINT "clinical_case_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_case_termination" ADD CONSTRAINT "clinical_case_termination_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "clinical_screening_info"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_case_termination" ADD CONSTRAINT "clinical_case_termination_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "clinical_session_attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_case_termination" ADD CONSTRAINT "clinical_case_termination_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
