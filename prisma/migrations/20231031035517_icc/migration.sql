/*
  Warnings:

  - You are about to drop the column `create_screening_id` on the `students` table. All the data in the column will be lost.
  - Added the required column `year_of_implementation` to the `intervention_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "intervention_sessions" ADD COLUMN     "year_of_implementation" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "students" DROP COLUMN "create_screening_id",
ADD COLUMN     "is_clinical_case" BOOLEAN;
