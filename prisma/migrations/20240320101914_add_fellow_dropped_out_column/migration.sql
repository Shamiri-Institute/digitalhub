-- AlterTable
ALTER TABLE "fellows" ADD COLUMN IF NOT EXISTS    "dropped_out_at" TIMESTAMPTZ;
