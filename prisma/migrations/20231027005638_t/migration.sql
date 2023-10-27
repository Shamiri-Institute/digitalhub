-- DropForeignKey
ALTER TABLE "supervisors" DROP CONSTRAINT "supervisors_hub_id_fkey";

-- AlterTable
ALTER TABLE "supervisors" ALTER COLUMN "hub_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "supervisors" ADD CONSTRAINT "supervisors_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
