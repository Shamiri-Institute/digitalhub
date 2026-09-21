-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('Scheduled', 'Rescheduled', 'Cancelled');

-- AlterTable
ALTER TABLE "intervention_sessions" ADD COLUMN     "schedule_history" JSONB,
ADD COLUMN     "session_end_time" TIMESTAMP(3),
ADD COLUMN     "status" "SessionStatus" DEFAULT 'Scheduled';
