-- DropForeignKey
ALTER TABLE "fellow_attendances" DROP CONSTRAINT "fellow_attendances_supervisor_id_fkey";

-- DropForeignKey
ALTER TABLE "payout_statements" DROP CONSTRAINT "payout_statements_created_by_fkey";

-- AlterTable
ALTER TABLE "fellow_attendances" ALTER COLUMN "supervisor_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "fellow_attendances" ADD CONSTRAINT "fellow_attendances_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_statements" ADD CONSTRAINT "payout_statements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
