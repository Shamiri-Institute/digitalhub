-- DropForeignKey
ALTER TABLE "reimbursement_requests" DROP CONSTRAINT "reimbursement_requests_hub_coordinator_id_fkey";

-- AlterTable
ALTER TABLE "reimbursement_requests" ALTER COLUMN "hub_coordinator_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_hub_coordinator_id_fkey" FOREIGN KEY ("hub_coordinator_id") REFERENCES "hub_coordinators"("id") ON DELETE SET NULL ON UPDATE CASCADE;
