-- AlterTable
ALTER TABLE "payout_statements" ADD COLUMN     "confirmed_at" TIMESTAMPTZ,
ADD COLUMN     "confirmed_by" TEXT;

-- AddForeignKey
ALTER TABLE "payout_statements" ADD CONSTRAINT "payout_statements_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
