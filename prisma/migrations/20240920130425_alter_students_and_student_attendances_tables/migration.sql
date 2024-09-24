/*
  Warnings:

  - You are about to drop the column `attendance_session_0` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `attendance_session_1` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `attendance_session_2` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `attendance_session_3` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `attendance_session_4` on the `students` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[student_id,session_id]` on the table `student_attendances` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "student_attendances" DROP CONSTRAINT "student_attendances_fellow_id_fkey";

-- DropForeignKey
ALTER TABLE "student_attendances" DROP CONSTRAINT "student_attendances_school_id_fkey";

-- AlterTable
ALTER TABLE "student_attendances" ADD COLUMN     "comments" TEXT,
ADD COLUMN     "marked_by" TEXT,
ALTER COLUMN "school_id" DROP NOT NULL,
ALTER COLUMN "fellow_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "students" DROP COLUMN "attendance_session_0",
DROP COLUMN "attendance_session_1",
DROP COLUMN "attendance_session_2",
DROP COLUMN "attendance_session_3",
DROP COLUMN "attendance_session_4";

-- CreateIndex
CREATE UNIQUE INDEX "student_attendances_student_id_session_id_key" ON "student_attendances"("student_id", "session_id");

-- AddForeignKey
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "fellows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
