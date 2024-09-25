-- DropForeignKey
ALTER TABLE "student_complaints" DROP CONSTRAINT "student_complaints_student_id_fkey";

-- DropForeignKey
ALTER TABLE "student_complaints" DROP CONSTRAINT "student_complaints_supervisor_id_fkey";

-- Rename Table
ALTER TABLE "student_complaints" RENAME TO "student_reporting_notes";

-- Rename column
ALTER TABLE "student_reporting_notes" RENAME COLUMN "complaint" TO "notes";

-- Add column
ALTER TABLE "student_reporting_notes" ADD COLUMN "addedBy" TEXT;
ALTER TABLE "student_reporting_notes" ALTER COLUMN "supervisor_id" DROP NOT NULL;

ALTER TABLE "student_reporting_notes" RENAME CONSTRAINT "student_complaints_pkey" TO "student_reporting_notes_pkey";

-- AddForeignKey
ALTER TABLE "student_reporting_notes" ADD CONSTRAINT "student_reporting_notes_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_reporting_notes" ADD CONSTRAINT "student_reporting_notes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_reporting_notes" ADD CONSTRAINT "student_reporting_notes_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
