-- DropForeignKey
ALTER TABLE "fellow_attendances" DROP CONSTRAINT "fellow_attendances_school_id_fkey";

-- DropForeignKey
ALTER TABLE "intervention_sessions" DROP CONSTRAINT "intervention_sessions_school_id_fkey";

-- DropForeignKey
ALTER TABLE "supervisor_attendances" DROP CONSTRAINT "supervisor_attendances_school_id_fkey";

-- AlterTable
ALTER TABLE "fellow_attendances" ALTER COLUMN "school_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "intervention_sessions" ADD COLUMN     "venue" TEXT,
ALTER COLUMN "school_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "supervisor_attendances" ALTER COLUMN "school_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "fellow_attendances" ADD CONSTRAINT "fellow_attendances_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_attendances" ADD CONSTRAINT "supervisor_attendances_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_sessions" ADD CONSTRAINT "intervention_sessions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
