/*
  Warnings:

  - You are about to drop the `clinical_case_transfer_history` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "referralStatusOptions" AS ENUM ('Approved', 'Declined', 'Pending');

-- DropForeignKey
ALTER TABLE "clinical_case_transfer_history" DROP CONSTRAINT "clinical_case_transfer_history_caseId_fkey";

-- AlterTable
ALTER TABLE "clinical_screening_info" ADD COLUMN     "referral_status" "referralStatusOptions";

-- DropTable
DROP TABLE "clinical_case_transfer_history";

-- CreateTable
CREATE TABLE "clinical_case_transfer_trail" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "from" VARCHAR(255) NOT NULL,
    "from_role" VARCHAR(255) NOT NULL,
    "to" VARCHAR(255) NOT NULL,
    "to_role" VARCHAR(255) NOT NULL,
    "caseId" TEXT NOT NULL,
    "referral_status" "referralStatusOptions",

    CONSTRAINT "clinical_case_transfer_trail_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "clinical_case_transfer_trail" ADD CONSTRAINT "clinical_case_transfer_trail_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "clinical_screening_info"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
