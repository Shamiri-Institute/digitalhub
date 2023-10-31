/*
  Warnings:

  - Added the required column `session_type` to the `intervention_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "intervention_sessions" ADD COLUMN     "session_type" VARCHAR(255) NOT NULL;
