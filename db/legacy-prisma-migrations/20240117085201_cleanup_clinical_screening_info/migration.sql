/*
  Warnings:

  - You are about to drop the column `commment` on the `clinical_expert_case_notes` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `clinical_expert_case_notes` table. All the data in the column will be lost.
  - Added the required column `comment` to the `clinical_expert_case_notes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "clinical_expert_case_notes" DROP COLUMN "commment",
DROP COLUMN "date",
ADD COLUMN     "comment" TEXT NOT NULL;
