/*
  Warnings:

  - Added the required column `dropped_out_at` to the `schools` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "dropped_out_at" TIMESTAMPTZ NOT NULL;
