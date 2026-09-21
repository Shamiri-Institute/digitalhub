-- CreateEnum
CREATE TYPE "adaptation_types" AS ENUM ('CONTENT', 'PACING', 'LANGUAGE', 'FORMAT', 'OTHER');

-- CreateEnum
CREATE TYPE "support_types" AS ENUM ('TRAINING', 'CHECK_INS', 'MATERIALS', 'PEER_SUPPORT', 'SUFFICIENT', 'OTHER');

-- AlterTable
ALTER TABLE "attendance_documents" ALTER COLUMN "archived_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ticket_escalations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tickets" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "fellow_group_reports" (
    "id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMPTZ NOT NULL,
    "fellow_id" VARCHAR(255) NOT NULL,
    "group_id" VARCHAR(255) NOT NULL,
    "project_id" VARCHAR(100) NOT NULL,
    "structural_fidelity" INTEGER NOT NULL,
    "process_fidelity" INTEGER NOT NULL,
    "adaptations_made" BOOLEAN NOT NULL,
    "adaptation_type" "adaptation_types",
    "adaptation_reason" VARCHAR(500),
    "behavioral_engagement" INTEGER NOT NULL,
    "reflective_engagement" INTEGER NOT NULL,
    "psychological_safety" INTEGER NOT NULL,
    "group_cohesion" INTEGER NOT NULL,
    "climate_concerns" BOOLEAN NOT NULL,
    "climate_concerns_detail" VARCHAR(500),
    "skill_comprehension" INTEGER NOT NULL,
    "in_session_transfer" INTEGER NOT NULL,
    "home_practice_applicable" BOOLEAN NOT NULL,
    "home_practice_engagement" INTEGER,
    "fellow_group_relationship" INTEGER NOT NULL,
    "external_disruptions" BOOLEAN NOT NULL,
    "external_disruptions_detail" VARCHAR(500),
    "facilitator_confidence" INTEGER NOT NULL,
    "hardest_aspect" VARCHAR(500) NOT NULL,
    "challenge_impact" INTEGER NOT NULL,
    "what_went_well" VARCHAR(500) NOT NULL,
    "support_type" "support_types" NOT NULL,
    "support_detail" VARCHAR(500),

    CONSTRAINT "fellow_group_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fellow_group_reports_group_id_idx" ON "fellow_group_reports"("group_id");

-- CreateIndex
CREATE INDEX "fellow_group_reports_project_id_idx" ON "fellow_group_reports"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "fellow_group_reports_fellow_id_group_id_key" ON "fellow_group_reports"("fellow_id", "group_id");

-- AddForeignKey
ALTER TABLE "fellow_group_reports" ADD CONSTRAINT "fellow_group_reports_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "fellows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellow_group_reports" ADD CONSTRAINT "fellow_group_reports_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "intervention_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellow_group_reports" ADD CONSTRAINT "fellow_group_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
