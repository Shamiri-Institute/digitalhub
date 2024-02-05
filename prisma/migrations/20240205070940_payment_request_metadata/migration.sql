-- AlterTable
ALTER TABLE "delayed_payment_requests" ADD COLUMN     "fulfilled_at" TIMESTAMPTZ,
ADD COLUMN     "rejected_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "repayment_requests" ADD COLUMN     "fulfilled_at" TIMESTAMPTZ,
ADD COLUMN     "rejected_at" TIMESTAMPTZ;
