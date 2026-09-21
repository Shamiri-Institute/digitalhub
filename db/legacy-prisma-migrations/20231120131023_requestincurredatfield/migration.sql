/*
  Warnings:

  - Added the required column `incurred_at` to the `reimbursement_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "reimbursement_requests" ADD COLUMN     "incurred_at" TIMESTAMPTZ NOT NULL;
