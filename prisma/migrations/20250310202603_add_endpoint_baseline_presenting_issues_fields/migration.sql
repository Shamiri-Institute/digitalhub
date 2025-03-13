-- AlterTable
ALTER TABLE "clinical_screening_info" ADD COLUMN     "emergency_presenting_issues_baseline" JSON,
ADD COLUMN     "emergency_presenting_issues_endpoint" JSON,
ADD COLUMN     "general_presenting_issues_baseline" JSON,
ADD COLUMN     "general_presenting_issues_endpoint" JSON,
ADD COLUMN     "general_presenting_issues_other_specified_baseline" TEXT,
ADD COLUMN     "general_presenting_issues_other_specified_endpoint" TEXT;
