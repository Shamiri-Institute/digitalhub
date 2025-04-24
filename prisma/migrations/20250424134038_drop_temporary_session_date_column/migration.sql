/*
  Warnings:

  - You are about to drop the column `session_date_tz` on the `intervention_sessions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "intervention_sessions" DROP COLUMN "session_date_tz",
ALTER COLUMN "session_date" SET DATA TYPE TIMESTAMPTZ(6);
