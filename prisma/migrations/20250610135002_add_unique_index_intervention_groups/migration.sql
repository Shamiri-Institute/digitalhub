/*
  Warnings:

  - A unique constraint covering the columns `[intervention_session_id,group_id]` on the table `intervention_group_reports` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "intervention_group_reports_intervention_session_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "intervention_group_reports_intervention_session_id_group_id_key" ON "intervention_group_reports"("intervention_session_id", "group_id");
