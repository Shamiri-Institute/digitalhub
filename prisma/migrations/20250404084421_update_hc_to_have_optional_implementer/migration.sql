-- DropForeignKey
ALTER TABLE "hub_coordinators" DROP CONSTRAINT "hub_coordinators_implementer_id_fkey";

-- AlterTable
ALTER TABLE "hub_coordinators" ALTER COLUMN "implementer_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "hub_coordinators" ADD CONSTRAINT "hub_coordinators_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "implementers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
