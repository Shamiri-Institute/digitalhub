-- AlterTable
ALTER TABLE "supervisors" ADD COLUMN     "bank_account_name" VARCHAR(255),
ADD COLUMN     "bank_account_number" VARCHAR(255),
ADD COLUMN     "bank_branch" VARCHAR(255),
ADD COLUMN     "bank_name" VARCHAR(255),
ADD COLUMN     "county" VARCHAR(255),
ADD COLUMN     "sub_county" VARCHAR(255);
