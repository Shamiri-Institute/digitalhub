/*
  Warnings:

  - A unique constraint covering the columns `[session_type,school_id]` on the table `intervention_sessions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "unique_school_and_type_intervention_session";

-- CreateIndex
CREATE UNIQUE INDEX "intervention_sessions_session_type_school_id_key" ON "intervention_sessions"("session_type", "school_id");
