/*
  Warnings:

  - Added the required column `mpesa_name` to the `reimbursement_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mpesa_number` to the `reimbursement_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "reimbursement_requests" ADD COLUMN     "mpesa_name" VARCHAR(255) NOT NULL,
ADD COLUMN     "mpesa_number" VARCHAR(20) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'pending';
