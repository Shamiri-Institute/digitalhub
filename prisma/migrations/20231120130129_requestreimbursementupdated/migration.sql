/*
  Warnings:

  - Added the required column `hub_id` to the `reimbursement_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supervisor_id` to the `reimbursement_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "reimbursement_requests" ADD COLUMN     "hub_id" VARCHAR(255) NOT NULL,
ADD COLUMN     "supervisor_id" VARCHAR(255) NOT NULL;

-- AddForeignKey
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
