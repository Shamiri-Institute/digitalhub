-- AlterTable
ALTER TABLE "students" ADD COLUMN     "group_session_id" VARCHAR(255);

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_group_session_id_fkey" FOREIGN KEY ("group_session_id") REFERENCES "intervention_group_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
