/*
  Warnings:

  - You are about to drop the column `assigned_school_id` on the `supervisors` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "supervisors" DROP CONSTRAINT "supervisors_assigned_school_id_fkey";

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "assigned_supervisor_id" VARCHAR(255);

-- AlterTable
ALTER TABLE "supervisors" DROP COLUMN "assigned_school_id";

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_assigned_supervisor_id_fkey" FOREIGN KEY ("assigned_supervisor_id") REFERENCES "supervisors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
