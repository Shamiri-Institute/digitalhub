/*
  Warnings:

  - You are about to drop the column `group_name` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `hub_id` on the `students` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_hub_id_fkey";

-- AlterTable
ALTER TABLE "students" DROP COLUMN "group_name",
DROP COLUMN "hub_id",
ADD COLUMN     "group" VARCHAR(255);
