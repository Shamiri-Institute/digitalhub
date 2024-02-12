/*
  Warnings:

  - You are about to drop the column `fellowId` on the `payout_reconciliations` table. All the data in the column will be lost.
  - You are about to drop the column `relatedDetails` on the `payout_reconciliations` table. All the data in the column will be lost.
  - Added the required column `fellow_id` to the `payout_reconciliations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "payout_reconciliations" DROP CONSTRAINT "payout_reconciliations_fellowId_fkey";

-- AlterTable
ALTER TABLE "payout_reconciliations" DROP COLUMN "fellowId",
DROP COLUMN "relatedDetails",
ADD COLUMN     "fellow_id" TEXT NOT NULL,
ADD COLUMN     "related_details" JSONB;

-- AddForeignKey
ALTER TABLE "payout_reconciliations" ADD CONSTRAINT "payout_reconciliations_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "fellows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
