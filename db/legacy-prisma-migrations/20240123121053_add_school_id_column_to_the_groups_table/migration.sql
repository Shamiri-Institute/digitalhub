-- AlterTable
ALTER TABLE "intervention_group_sessions" ADD COLUMN     "school_id" TEXT;

-- AddForeignKey
ALTER TABLE "intervention_group_sessions" ADD CONSTRAINT "intervention_group_sessions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
