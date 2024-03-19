-- AlterTable
ALTER TABLE "clinical_screening_info" ADD COLUMN     "initial_referred_from" VARCHAR(255),
ADD COLUMN     "initial_referred_from_specified" VARCHAR(255),
ADD COLUMN     "non_suicidal_self_injury" BOOLEAN;
