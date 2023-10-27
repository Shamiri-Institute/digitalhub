/*
  Warnings:

  - You are about to drop the column `name` on the `students` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "students" DROP COLUMN "name",
ADD COLUMN     "student_name" VARCHAR(255);
