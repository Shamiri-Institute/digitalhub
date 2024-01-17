/*
  Warnings:

  - Made the column `implementer_id` on table `supervisors` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "supervisors" DROP CONSTRAINT "supervisors_implementer_id_fkey";

-- AlterTable
ALTER TABLE "supervisors" ALTER COLUMN "implementer_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "supervisors" ADD CONSTRAINT "supervisors_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "implementers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
