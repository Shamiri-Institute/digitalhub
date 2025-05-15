/*
  Warnings:

  - You are about to drop the column `behavioral_response` on the `clinical_case_notes` table. All the data in the column will be lost.
  - You are about to drop the column `emotional_response` on the `clinical_case_notes` table. All the data in the column will be lost.
  - You are about to drop the column `overall_feedback` on the `clinical_case_notes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "clinical_case_notes" DROP COLUMN "behavioral_response",
DROP COLUMN "emotional_response",
DROP COLUMN "overall_feedback";
