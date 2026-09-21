/*
  Warnings:

  - Added the required column `hub_coordinator_id` to the `reimbursement_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "reimbursement_requests" ADD COLUMN     "hub_coordinator_id" VARCHAR(255) NOT NULL;

-- AddForeignKey
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_hub_coordinator_id_fkey" FOREIGN KEY ("hub_coordinator_id") REFERENCES "hub_coordinators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
