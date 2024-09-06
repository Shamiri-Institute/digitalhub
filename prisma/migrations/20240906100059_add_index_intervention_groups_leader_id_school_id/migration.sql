/*
  Warnings:

  - A unique constraint covering the columns `[leader_id,school_id]` on the table `intervention_groups` will be added. If there are existing duplicate values, this will fail.
  - Made the column `leader_id` on table `intervention_groups` required. This step will fail if there are existing NULL values in that column.
  - Made the column `school_id` on table `intervention_groups` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "intervention_groups" DROP CONSTRAINT "intervention_groups_leader_id_fkey";

-- DropForeignKey
ALTER TABLE "intervention_groups" DROP CONSTRAINT "intervention_groups_school_id_fkey";

-- AlterTable
ALTER TABLE "intervention_groups" ALTER COLUMN "leader_id" SET NOT NULL,
ALTER COLUMN "school_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "year_of_birth" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "intervention_groups_leader_id_school_id_key" ON "intervention_groups"("leader_id", "school_id");

-- AddForeignKey
ALTER TABLE "intervention_groups" ADD CONSTRAINT "intervention_groups_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "fellows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_groups" ADD CONSTRAINT "intervention_groups_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
