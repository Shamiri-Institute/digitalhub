/*
  Warnings:

  - You are about to drop the column `email` on the `supervisors` table. All the data in the column will be lost.
  - You are about to drop the column `member_id` on the `supervisors` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[supervisor_email]` on the table `supervisors` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "supervisors" DROP CONSTRAINT "supervisors_member_id_fkey";

-- DropIndex
DROP INDEX "supervisors_email_key";

-- AlterTable
ALTER TABLE "supervisors" DROP COLUMN "email",
DROP COLUMN "member_id",
ADD COLUMN     "implementer_id" VARCHAR(255),
ADD COLUMN     "memberId" INTEGER,
ADD COLUMN     "supervisor_email" VARCHAR(255),
ALTER COLUMN "visible_id" SET DATA TYPE VARCHAR(100);

-- CreateIndex
CREATE UNIQUE INDEX "supervisors_supervisor_email_key" ON "supervisors"("supervisor_email");

-- AddForeignKey
ALTER TABLE "supervisors" ADD CONSTRAINT "supervisors_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "implementers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisors" ADD CONSTRAINT "supervisors_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "implementer_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
