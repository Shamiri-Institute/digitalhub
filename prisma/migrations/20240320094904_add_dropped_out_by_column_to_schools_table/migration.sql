-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "dropped_out_by" VARCHAR(255),
ALTER COLUMN "dropped_out_at" DROP NOT NULL;
