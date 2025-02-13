/*
  Warnings:

  - Added the required column `comments` to the `fellow_complaints` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "fellow_complaints" DROP CONSTRAINT "fellow_complaints_supervisor_id_fkey";

-- AlterTable
ALTER TABLE "fellow_complaints" ADD COLUMN     "comments" TEXT NOT NULL,
ADD COLUMN     "created_by" TEXT,
ALTER COLUMN "supervisor_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "fellow_complaints" ADD CONSTRAINT "fellow_complaints_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellow_complaints" ADD CONSTRAINT "fellow_complaints_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
