-- AlterTable
ALTER TABLE "fellow_complaints" ADD COLUMN     "additional_comments" TEXT,
ADD COLUMN     "complaint_type" TEXT,
ALTER COLUMN "complaint" DROP NOT NULL;
