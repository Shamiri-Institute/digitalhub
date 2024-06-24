/*
  Warnings:

  - You are about to drop the column `positive_highlights` on the `weekly_hub_reports` table. All the data in the column will be lost.
  - You are about to drop the column `reported_challenges` on the `weekly_hub_reports` table. All the data in the column will be lost.
  - Added the required column `challenges` to the `weekly_hub_reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fellow_related_issues_and_observations` to the `weekly_hub_reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fellow_related_issues_and_observations_rating` to the `weekly_hub_reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hub_related_issues_and_observations` to the `weekly_hub_reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hub_related_issues_and_observations_rating` to the `weekly_hub_reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `school_related_issues_and_observations` to the `weekly_hub_reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `school_related_issues_and_observations_rating` to the `weekly_hub_reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `successes` to the `weekly_hub_reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supervisor_related_issues_and_observations` to the `weekly_hub_reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supervisor_related_issues_and_observations_rating` to the `weekly_hub_reports` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "weekly_hub_reports"
DROP COLUMN "positive_highlights",
DROP COLUMN "reported_challenges",
ADD COLUMN     "challenges" TEXT NOT NULL,
ADD COLUMN     "fellow_related_issues_and_observations" TEXT NOT NULL,
ADD COLUMN     "fellow_related_issues_and_observations_rating" INTEGER NOT NULL,
ADD COLUMN     "hub_related_issues_and_observations" TEXT NOT NULL,
ADD COLUMN     "hub_related_issues_and_observations_rating" INTEGER NOT NULL,
ADD COLUMN     "school_related_issues_and_observations" TEXT NOT NULL,
ADD COLUMN     "school_related_issues_and_observations_rating" INTEGER NOT NULL,
ADD COLUMN     "successes" TEXT NOT NULL,
ADD COLUMN     "supervisor_related_issues_and_observations" TEXT NOT NULL,
ADD COLUMN     "supervisor_related_issues_and_observations_rating" INTEGER NOT NULL;
