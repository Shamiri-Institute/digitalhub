-- DropForeignKey
ALTER TABLE "intervention_sessions" DROP CONSTRAINT "intervention_sessions_school_id_fkey";

-- AlterTable
ALTER TABLE "intervention_sessions" ADD COLUMN     "venue" TEXT,
ALTER COLUMN "school_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "intervention_sessions" ADD CONSTRAINT "intervention_sessions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
