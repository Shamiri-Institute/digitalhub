/*
  Warnings:

  - A unique constraint covering the columns `[visible_id]` on the table `students` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `students` table without a default value. This is not possible if the table is not empty.
  - Added the required column `visible_id` to the `students` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "students" ADD COLUMN     "admission_number" VARCHAR(255),
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "attendance_session_0" BOOLEAN,
ADD COLUMN     "attendance_session_1" BOOLEAN,
ADD COLUMN     "attendance_session_2" BOOLEAN,
ADD COLUMN     "attendance_session_3" BOOLEAN,
ADD COLUMN     "attendance_session_4" BOOLEAN,
ADD COLUMN     "co_curricular" VARCHAR(255),
ADD COLUMN     "condition" VARCHAR(255),
ADD COLUMN     "county" VARCHAR(255),
ADD COLUMN     "create_screening_id" BOOLEAN,
ADD COLUMN     "fathers_education" VARCHAR(255),
ADD COLUMN     "fellow_id" VARCHAR(255),
ADD COLUMN     "financial_status" VARCHAR(255),
ADD COLUMN     "form" INTEGER,
ADD COLUMN     "gender" VARCHAR(10),
ADD COLUMN     "group_name" VARCHAR(255),
ADD COLUMN     "home" VARCHAR(255),
ADD COLUMN     "implementer_id" VARCHAR(255),
ADD COLUMN     "intervention" VARCHAR(255),
ADD COLUMN     "mothers_education" VARCHAR(255),
ADD COLUMN     "mpesa_number" VARCHAR(255),
ADD COLUMN     "name" VARCHAR(255) NOT NULL,
ADD COLUMN     "parents_dead" VARCHAR(255),
ADD COLUMN     "phone_number" VARCHAR(255),
ADD COLUMN     "religion" VARCHAR(255),
ADD COLUMN     "school_id" VARCHAR(255),
ADD COLUMN     "siblings" VARCHAR(255),
ADD COLUMN     "sports" VARCHAR(255),
ADD COLUMN     "stream" VARCHAR(255),
ADD COLUMN     "supervisor_id" VARCHAR(255),
ADD COLUMN     "surviving_parents" VARCHAR(255),
ADD COLUMN     "tribe" VARCHAR(255),
ADD COLUMN     "visible_id" VARCHAR(100) NOT NULL,
ADD COLUMN     "year_of_implementation" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "students_visible_id_key" ON "students"("visible_id");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "fellows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "implementers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
