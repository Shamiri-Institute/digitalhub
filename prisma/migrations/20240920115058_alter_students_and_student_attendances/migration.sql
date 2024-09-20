/*
  Warnings:

  - You are about to drop the column `fellow_id` on the `student_attendances` table. All the data in the column will be lost.
  - You are about to drop the column `group_id` on the `student_attendances` table. All the data in the column will be lost.
  - You are about to drop the column `school_id` on the `student_attendances` table. All the data in the column will be lost.
  - You are about to drop the column `attendance_session_0` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `attendance_session_1` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `attendance_session_2` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `attendance_session_3` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `attendance_session_4` on the `students` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[student_id,session_id]` on the table `student_attendances` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `marked_by` to the `student_attendances` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "student_attendances" DROP CONSTRAINT "student_attendances_fellow_id_fkey";

-- DropForeignKey
ALTER TABLE "student_attendances" DROP CONSTRAINT "student_attendances_group_id_fkey";

-- DropForeignKey
ALTER TABLE "student_attendances" DROP CONSTRAINT "student_attendances_school_id_fkey";

-- AlterTable
ALTER TABLE "student_attendances" DROP COLUMN "fellow_id",
DROP COLUMN "group_id",
DROP COLUMN "school_id",
ADD COLUMN     "comments" TEXT,
ADD COLUMN     "marked_by" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "students" DROP COLUMN "attendance_session_0",
DROP COLUMN "attendance_session_1",
DROP COLUMN "attendance_session_2",
DROP COLUMN "attendance_session_3",
DROP COLUMN "attendance_session_4";

-- CreateIndex
CREATE UNIQUE INDEX "student_attendances_student_id_session_id_key" ON "student_attendances"("student_id", "session_id");

-- AddForeignKey
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
