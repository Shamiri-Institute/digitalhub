-- AlterTable
ALTER TABLE "fellow_attendances" ALTER COLUMN "session_number" DROP NOT NULL,
ALTER COLUMN "session_date" DROP NOT NULL,
ALTER COLUMN "year_of_implementation" DROP NOT NULL;
