-- CreateTable
CREATE TABLE "monthly_supervisor_evaluation" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "project_id" TEXT NOT NULL,
    "supervisor_id" VARCHAR(255) NOT NULL,
    "hub_coordinator_id" VARCHAR(255) NOT NULL,
    "month" DATE NOT NULL,
    "respectfulness" INTEGER NOT NULL,
    "attitude" INTEGER NOT NULL,
    "collaboration" INTEGER NOT NULL,
    "reliability" INTEGER NOT NULL,
    "identification_of_issues" INTEGER NOT NULL,
    "leadership" INTEGER NOT NULL,
    "communication_style" INTEGER NOT NULL,
    "conflict_resolution" INTEGER NOT NULL,
    "adaptability" INTEGER NOT NULL,
    "recognition_and_feedback" INTEGER NOT NULL,
    "decision_making" INTEGER NOT NULL,
    "fellow_recruitment_effectiveness" INTEGER NOT NULL,
    "fellow_training_effectiveness" INTEGER NOT NULL,
    "program_logistics_coordination" INTEGER NOT NULL,
    "program_session_attendace" INTEGER NOT NULL,
    "management_style_comments" TEXT,
    "workplace_demeanor_comments" TEXT,
    "program_execution_comments" TEXT,

    CONSTRAINT "monthly_supervisor_evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "monthly_supervisor_evaluation_project_id_month_supervisor_i_key" ON "monthly_supervisor_evaluation"("project_id", "month", "supervisor_id");

-- AddForeignKey
ALTER TABLE "monthly_supervisor_evaluation" ADD CONSTRAINT "monthly_supervisor_evaluation_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_supervisor_evaluation" ADD CONSTRAINT "monthly_supervisor_evaluation_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_supervisor_evaluation" ADD CONSTRAINT "monthly_supervisor_evaluation_hub_coordinator_id_fkey" FOREIGN KEY ("hub_coordinator_id") REFERENCES "hub_coordinators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
