/*
  Warnings:

  - You are about to drop the column `dressing_and_grooming_rating` on the `overall_fellow_evaluation` table. All the data in the column will be lost.
  - You are about to drop the column `fellow_behaviour_rating` on the `overall_fellow_evaluation` table. All the data in the column will be lost.
  - You are about to drop the column `program_delivery_rating` on the `overall_fellow_evaluation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "overall_fellow_evaluation" DROP COLUMN "dressing_and_grooming_rating",
DROP COLUMN "fellow_behaviour_rating",
DROP COLUMN "program_delivery_rating";
