/*
  Warnings:

  - Updating the column name from `attendance_notes` to `punctuality_notes` in the `overall_fellow_evaluations` table.
  - Updating the column name from `attendance_notes` to `punctuality_notes` in the `weekly_fellow_ratings` table.

*/
-- AlterTable
ALTER TABLE "overall_fellow_evaluations" RENAME COLUMN "attendance_notes" TO "punctuality_notes";

-- AlterTable
ALTER TABLE "weekly_fellow_ratings" RENAME COLUMN "attendance_notes" TO "punctuality_notes";
