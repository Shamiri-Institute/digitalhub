/*
  Warnings:

  - You are about to drop the column `visible_id` on the `supervisor_attendances` table. All the data in the column will be lost.
  - Added the required column `marked_by` to the `supervisor_attendances` table without a default value. This is not possible if the table is not empty.

*/

-- AlterTable
ALTER TABLE "supervisor_attendances" ADD COLUMN "marked_by" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "supervisor_attendances" ADD CONSTRAINT "supervisor_attendances_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
