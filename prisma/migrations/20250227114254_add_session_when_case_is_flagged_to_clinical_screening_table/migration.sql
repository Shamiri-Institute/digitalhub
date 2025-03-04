-- AlterTable
ALTER TABLE "clinical_screening_info" ADD COLUMN     "session_when_case_is_flagged_id" VARCHAR(255);

-- AddForeignKey
ALTER TABLE "clinical_screening_info" ADD CONSTRAINT "clinical_screening_info_session_when_case_is_flagged_id_fkey" FOREIGN KEY ("session_when_case_is_flagged_id") REFERENCES "intervention_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
