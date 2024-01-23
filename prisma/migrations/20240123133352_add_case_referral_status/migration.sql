-- AlterTable
ALTER TABLE "clinical_case_transfer_history" ADD COLUMN     "referral_status" VARCHAR(255);

-- AlterTable
ALTER TABLE "clinical_screening_info" ADD COLUMN     "referral_status" VARCHAR(255);
