-- AlterTable
ALTER TABLE "payout_statements" ADD COLUMN     "confirmed_at" TIMESTAMPTZ,
ADD COLUMN     "confirmed_by" TEXT;
