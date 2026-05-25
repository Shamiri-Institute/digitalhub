-- CreateIndex
CREATE INDEX "intervention_sessions_school_id_idx" ON "intervention_sessions"("school_id");

-- CreateIndex
CREATE INDEX "students_assigned_group_id_idx" ON "students"("assigned_group_id");
