-- AddForeignKey
ALTER TABLE "student_group_transfer_trail" ADD CONSTRAINT "student_group_transfer_trail_from_group_id_fkey" FOREIGN KEY ("from_group_id") REFERENCES "intervention_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
