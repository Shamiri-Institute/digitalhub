-- DropForeignKey
ALTER TABLE "student_attendances" DROP CONSTRAINT "student_attendances_group_id_fkey";

-- AlterTable
ALTER TABLE "student_attendances" ALTER COLUMN "group_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "intervention_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
