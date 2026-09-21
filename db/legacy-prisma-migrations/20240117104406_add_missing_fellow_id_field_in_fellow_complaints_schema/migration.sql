/*
  Warnings:

  - Added the required column `fellow_id` to the `FellowComplaints` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FellowComplaints" ADD COLUMN     "fellow_id" VARCHAR(255) NOT NULL;

-- AddForeignKey
ALTER TABLE "FellowComplaints" ADD CONSTRAINT "FellowComplaints_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "fellows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
