-- CreateTable
CREATE TABLE "monthly_supervisor_evaluation" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "project_id" TEXT NOT NULL,
    "supervisor_id" VARCHAR(255) NOT NULL,
    "hub_coordinator_id" VARCHAR(255) NOT NULL,
    "month" DATE NOT NULL,

    CONSTRAINT "monthly_supervisor_evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workplace_demeanor_ratings" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "monthly_supervisor_evaluation_id" TEXT NOT NULL,
    "additional_comments" TEXT NOT NULL,
    "respectfulness" INTEGER NOT NULL,
    "attitude" INTEGER NOT NULL,
    "collaboration" INTEGER NOT NULL,
    "reliability" INTEGER NOT NULL,
    "identification_of_issues" INTEGER NOT NULL,

    CONSTRAINT "workplace_demeanor_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "management_style_ratings" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "monthly_supervisor_evaluation_id" TEXT NOT NULL,
    "additional_comments" TEXT NOT NULL,
    "leadership" INTEGER NOT NULL,
    "communication_style" INTEGER NOT NULL,
    "conflict_resolution" INTEGER NOT NULL,
    "adaptability" INTEGER NOT NULL,
    "recognition_and_feedback" INTEGER NOT NULL,
    "decision_making" INTEGER NOT NULL,

    CONSTRAINT "management_style_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_execution_ratings" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "monthly_supervisor_evaluation_id" TEXT NOT NULL,
    "additional_comments" TEXT NOT NULL,
    "fellow_recruitment_effectiveness" INTEGER NOT NULL,
    "fellow_training_effectiveness" INTEGER NOT NULL,
    "program_logistics_coordination" INTEGER NOT NULL,
    "program_session_attendace" INTEGER NOT NULL,

    CONSTRAINT "program_execution_ratings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "monthly_supervisor_evaluation" ADD CONSTRAINT "monthly_supervisor_evaluation_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_supervisor_evaluation" ADD CONSTRAINT "monthly_supervisor_evaluation_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_supervisor_evaluation" ADD CONSTRAINT "monthly_supervisor_evaluation_hub_coordinator_id_fkey" FOREIGN KEY ("hub_coordinator_id") REFERENCES "hub_coordinators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workplace_demeanor_ratings" ADD CONSTRAINT "workplace_demeanor_ratings_monthly_supervisor_evaluation_i_fkey" FOREIGN KEY ("monthly_supervisor_evaluation_id") REFERENCES "monthly_supervisor_evaluation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "management_style_ratings" ADD CONSTRAINT "management_style_ratings_monthly_supervisor_evaluation_id_fkey" FOREIGN KEY ("monthly_supervisor_evaluation_id") REFERENCES "monthly_supervisor_evaluation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_execution_ratings" ADD CONSTRAINT "program_execution_ratings_monthly_supervisor_evaluation_id_fkey" FOREIGN KEY ("monthly_supervisor_evaluation_id") REFERENCES "monthly_supervisor_evaluation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
