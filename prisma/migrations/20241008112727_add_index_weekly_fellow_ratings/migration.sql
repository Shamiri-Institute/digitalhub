/*
  Warnings:

  - A unique constraint covering the columns `[fellow_id,supervisor_id,week]` on the table `weekly_fellow_ratings` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "weekly_fellow_ratings_fellow_id_supervisor_id_week_key" ON "weekly_fellow_ratings"("fellow_id", "supervisor_id", "week");
