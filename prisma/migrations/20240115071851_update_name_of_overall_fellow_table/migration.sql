/*
  Warnings:

  - You are about to drop the `overall_fellow_evaluation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "overall_fellow_evaluation" DROP CONSTRAINT "overall_fellow_evaluation_fellow_id_fkey";

-- DropForeignKey
ALTER TABLE "overall_fellow_evaluation" DROP CONSTRAINT "overall_fellow_evaluation_supervisor_id_fkey";

-- DropTable
DROP TABLE "overall_fellow_evaluation";

-- CreateTable
CREATE TABLE "overall_fellow_evaluations" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMPTZ,
    "supervisor_id" VARCHAR(255) NOT NULL,
    "fellow_id" VARCHAR(255) NOT NULL,
    "fellow_behaviour_notes" TEXT NOT NULL,
    "program_delivery_notes" TEXT NOT NULL,
    "dressing_and_grooming_notes" TEXT NOT NULL,
    "attendance_notes" TEXT NOT NULL,

    CONSTRAINT "overall_fellow_evaluations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "overall_fellow_evaluations" ADD CONSTRAINT "overall_fellow_evaluations_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overall_fellow_evaluations" ADD CONSTRAINT "overall_fellow_evaluations_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "fellows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
