-- DropForeignKey
ALTER TABLE "student_outcomes" DROP CONSTRAINT "student_outcomes_implementer_id_fkey";

-- AddForeignKey
ALTER TABLE "student_outcomes" ADD CONSTRAINT "student_outcomes_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "implementers"("visible_id") ON DELETE SET NULL ON UPDATE CASCADE;
