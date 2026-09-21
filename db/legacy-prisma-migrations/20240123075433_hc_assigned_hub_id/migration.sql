/*
  Warnings:

  - You are about to drop the column `coordinator_id` on the `hubs` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "hubs" DROP CONSTRAINT "hubs_coordinator_id_fkey";

-- AlterTable
ALTER TABLE "hub_coordinators" ADD COLUMN     "assigned_hub_id" VARCHAR(255);

-- AlterTable
ALTER TABLE "hubs" DROP COLUMN "coordinator_id";

-- AddForeignKey
ALTER TABLE "hub_coordinators" ADD CONSTRAINT "hub_coordinators_assigned_hub_id_fkey" FOREIGN KEY ("assigned_hub_id") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
