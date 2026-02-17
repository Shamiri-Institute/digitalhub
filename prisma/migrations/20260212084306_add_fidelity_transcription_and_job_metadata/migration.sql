-- AlterTable
ALTER TABLE "session_recordings" ADD COLUMN     "fidelity_job_id" VARCHAR(255),
ADD COLUMN     "fidelity_job_submitted_at" TIMESTAMPTZ,
ADD COLUMN     "transcript" JSONB;
