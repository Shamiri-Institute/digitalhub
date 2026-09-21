/*
  Warnings:

  - A unique constraint covering the columns `[session_id,supervisor_id]` on the table `intervention_session_ratings` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "intervention_session_ratings_session_id_supervisor_id_key" ON "intervention_session_ratings"("session_id", "supervisor_id");
