-- DropForeignKey
ALTER TABLE "clinical_screening_info" DROP CONSTRAINT "clinical_screening_info_current_supervisor_id_fkey";

-- AlterTable
ALTER TABLE "clinical_screening_info" ALTER COLUMN "current_supervisor_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "clinical_session_attendance" ADD COLUMN     "clinicalLeadId" TEXT,
ALTER COLUMN "supervisor_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "clinical_screening_info" ADD CONSTRAINT "clinical_screening_info_current_supervisor_id_fkey" FOREIGN KEY ("current_supervisor_id") REFERENCES "supervisors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
