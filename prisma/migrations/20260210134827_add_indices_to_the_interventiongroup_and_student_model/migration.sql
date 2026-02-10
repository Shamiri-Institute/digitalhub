-- CreateIndex
CREATE INDEX "intervention_groups_leader_id_idx" ON "intervention_groups"("leader_id");

-- CreateIndex
CREATE INDEX "students_assigned_group_id_idx" ON "students"("assigned_group_id");
