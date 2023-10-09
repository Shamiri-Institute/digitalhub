/*
  Warnings:

  - You are about to drop the column `member_id` on the `hubs` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "hubs" DROP CONSTRAINT "hubs_member_id_fkey";

-- AlterTable
ALTER TABLE "hubs" DROP COLUMN "member_id",
ADD COLUMN     "coordinator_id" INTEGER;

-- AddForeignKey
ALTER TABLE "hubs" ADD CONSTRAINT "hubs_coordinator_id_fkey" FOREIGN KEY ("coordinator_id") REFERENCES "organization_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
