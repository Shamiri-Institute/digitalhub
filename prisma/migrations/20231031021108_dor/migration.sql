/*
  Warnings:

  - You are about to drop the column `dropped_out_reason` on the `students` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "students" DROP COLUMN "dropped_out_reason",
ADD COLUMN     "drop_out_reason" TEXT;
