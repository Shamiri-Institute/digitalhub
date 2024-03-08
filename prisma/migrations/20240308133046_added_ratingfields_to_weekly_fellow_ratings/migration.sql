/*
  Warnings:

  - Added the required column `behaviour_rating` to the `weekly_fellow_ratings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dressing_and_grooming_rating` to the `weekly_fellow_ratings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `program_delivery_rating` to the `weekly_fellow_ratings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `punctuality_rating` to the `weekly_fellow_ratings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "weekly_fellow_ratings" ADD COLUMN     "behaviour_rating" INTEGER NOT NULL,
ADD COLUMN     "dressing_and_grooming_rating" INTEGER NOT NULL,
ADD COLUMN     "program_delivery_rating" INTEGER NOT NULL,
ADD COLUMN     "punctuality_rating" INTEGER NOT NULL;
