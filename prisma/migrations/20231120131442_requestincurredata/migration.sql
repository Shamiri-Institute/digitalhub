/*
  Warnings:

  - Added the required column `amount` to the `reimbursement_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "reimbursement_requests" ADD COLUMN     "amount" INTEGER NOT NULL,
ADD COLUMN     "currency" VARCHAR(10) NOT NULL DEFAULT 'KES';
