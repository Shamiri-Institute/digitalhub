/*
  Warnings:

  - You are about to drop the column `group_session_id` on the `fellow_attendances` table. All the data in the column will be lost.
  - You are about to drop the column `group_session_id` on the `repayment_requests` table. All the data in the column will be lost.
  - You are about to drop the `_ImplementerToProjects` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `intervention_group_sessions` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `fellow_attendance_id` to the `repayment_requests` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_ImplementerToProjects" DROP CONSTRAINT "_ImplementerToProjects_A_fkey";

-- DropForeignKey
ALTER TABLE "_ImplementerToProjects" DROP CONSTRAINT "_ImplementerToProjects_B_fkey";

-- DropForeignKey
ALTER TABLE "fellow_attendances" DROP CONSTRAINT "fellow_attendances_group_session_id_fkey";

-- DropForeignKey
ALTER TABLE "intervention_group_sessions" DROP CONSTRAINT "intervention_group_sessions_leader_id_fkey";

-- DropForeignKey
ALTER TABLE "intervention_group_sessions" DROP CONSTRAINT "intervention_group_sessions_school_id_fkey";

-- DropForeignKey
ALTER TABLE "intervention_group_sessions" DROP CONSTRAINT "intervention_group_sessions_session_id_fkey";

-- DropForeignKey
ALTER TABLE "repayment_requests" DROP CONSTRAINT "repayment_requests_group_session_id_fkey";

-- AlterTable
ALTER TABLE "fellow_attendances" DROP COLUMN "group_session_id",
ADD COLUMN     "group_id" VARCHAR(255),
ADD COLUMN     "project_id" TEXT,
ADD COLUMN     "session_id" TEXT;

-- AlterTable
ALTER TABLE "intervention_sessions" ADD COLUMN     "project_id" VARCHAR(100);

-- AlterTable
ALTER TABLE "repayment_requests" DROP COLUMN "group_session_id",
ADD COLUMN     "fellow_attendance_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "assigned_group_id" TEXT;

-- DropTable
DROP TABLE "_ImplementerToProjects" CASCADE;

-- DropTable
DROP TABLE "intervention_group_sessions" CASCADE;

-- CreateTable
CREATE TABLE "student_attendances" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "project_id" TEXT NOT NULL,
    "student_id" VARCHAR(255) NOT NULL,
    "school_id" VARCHAR(255) NOT NULL,
    "fellow_id" VARCHAR(255) NOT NULL,
    "attended" BOOLEAN,
    "absence_reason" TEXT,
    "session_id" TEXT NOT NULL,
    "group_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "student_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intervention_groups" (
    "id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "group_name" VARCHAR(100) NOT NULL,
    "leader_id" VARCHAR(255),
    "school_id" TEXT,
    "project_id" VARCHAR(100) NOT NULL,

    CONSTRAINT "intervention_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ImplementerToProject" (
    "A" VARCHAR(255) NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ImplementerToProject_AB_unique" ON "_ImplementerToProject"("A", "B");

-- CreateIndex
CREATE INDEX "_ImplementerToProject_B_index" ON "_ImplementerToProject"("B");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_assigned_group_id_fkey" FOREIGN KEY ("assigned_group_id") REFERENCES "intervention_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "fellows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "intervention_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "intervention_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellow_attendances" ADD CONSTRAINT "fellow_attendances_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellow_attendances" ADD CONSTRAINT "fellow_attendances_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "intervention_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellow_attendances" ADD CONSTRAINT "fellow_attendances_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "intervention_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_sessions" ADD CONSTRAINT "intervention_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_groups" ADD CONSTRAINT "intervention_groups_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "fellows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_groups" ADD CONSTRAINT "intervention_groups_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_groups" ADD CONSTRAINT "intervention_groups_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayment_requests" ADD CONSTRAINT "repayment_requests_fellow_attendance_id_fkey" FOREIGN KEY ("fellow_attendance_id") REFERENCES "fellow_attendances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ImplementerToProject" ADD CONSTRAINT "_ImplementerToProject_A_fkey" FOREIGN KEY ("A") REFERENCES "implementers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ImplementerToProject" ADD CONSTRAINT "_ImplementerToProject_B_fkey" FOREIGN KEY ("B") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
