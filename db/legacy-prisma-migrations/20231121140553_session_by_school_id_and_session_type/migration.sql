/*
  Warnings:

  - A unique constraint covering the columns `[school_id,session_type]` on the table `intervention_sessions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "intervention_sessions_session_type_school_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "intervention_sessions_school_id_session_type_key" ON "intervention_sessions"("school_id", "session_type");
