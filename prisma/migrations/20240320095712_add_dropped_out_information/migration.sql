-- AlterTable
ALTER TABLE "fellows" ADD COLUMN     "dropped_out_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "dropped_out_by" VARCHAR(255),
ALTER COLUMN "dropped_out_at" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_dropped_out_by_fkey" FOREIGN KEY ("dropped_out_by") REFERENCES "hub_coordinators"("id") ON DELETE SET NULL ON UPDATE CASCADE;
