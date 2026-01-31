-- CreateEnum
CREATE TYPE "questionnaire_types" AS ENUM ('QA', 'JSS');

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "questionnaire_type" "questionnaire_types";
