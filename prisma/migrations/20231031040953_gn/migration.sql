/*
  Warnings:

  - You are about to drop the column `group` on the `students` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "students" DROP COLUMN "group",
ADD COLUMN     "group_name" VARCHAR(255);
