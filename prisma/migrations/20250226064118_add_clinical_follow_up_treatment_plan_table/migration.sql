-- CreateEnum
CREATE TYPE "CLINICAL_FOLLOW_UP_SESSION_FREQUENCY" AS ENUM ('ONCE_A_WEEK', 'TWICE_A_WEEK', 'ONCE_EVERY_TWO_WEEKS');

-- CreateTable
CREATE TABLE "clinical_follow_up_treatment_plan" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "current_ors_score" TEXT NOT NULL,
    "planned_sessions" INTEGER NOT NULL,
    "session_frequency" "CLINICAL_FOLLOW_UP_SESSION_FREQUENCY" NOT NULL,
    "planned_treatment_intervention" TEXT NOT NULL,
    "planned_treatment_intervention_explanation" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,

    CONSTRAINT "clinical_follow_up_treatment_plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinical_follow_up_treatment_plan_case_id_key" ON "clinical_follow_up_treatment_plan"("case_id");

-- AddForeignKey
ALTER TABLE "clinical_follow_up_treatment_plan" ADD CONSTRAINT "clinical_follow_up_treatment_plan_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "clinical_screening_info"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
