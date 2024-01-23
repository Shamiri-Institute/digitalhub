/*
  Warnings:

  - Added the required column `week` to the `weekly_fellow_ratings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "weekly_fellow_ratings" ADD COLUMN     "week" DATE NOT NULL,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ;
