-- CreateEnum
CREATE TYPE "recording_processing_status" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "session_recordings" (
    "id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "archived_at" TIMESTAMPTZ,
    "file_name" VARCHAR(255) NOT NULL,
    "original_file_name" VARCHAR(255) NOT NULL,
    "s3_key" VARCHAR(500) NOT NULL,
    "content_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "fellow_id" VARCHAR(255) NOT NULL,
    "school_id" VARCHAR(255) NOT NULL,
    "group_id" VARCHAR(255) NOT NULL,
    "intervention_session_id" VARCHAR(255) NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "supervisor_id" VARCHAR(255) NOT NULL,
    "status" "recording_processing_status" NOT NULL DEFAULT 'PENDING',
    "processed_at" TIMESTAMPTZ,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "fidelity_feedback" JSONB,
    "overall_score" VARCHAR(50),

    CONSTRAINT "session_recordings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_recordings_supervisor_id_idx" ON "session_recordings"("supervisor_id");

-- CreateIndex
CREATE INDEX "session_recordings_status_idx" ON "session_recordings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "session_recordings_fellow_id_school_id_group_id_interventio_key" ON "session_recordings"("fellow_id", "school_id", "group_id", "intervention_session_id");

-- AddForeignKey
ALTER TABLE "session_recordings" ADD CONSTRAINT "session_recordings_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "fellows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_recordings" ADD CONSTRAINT "session_recordings_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_recordings" ADD CONSTRAINT "session_recordings_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "intervention_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_recordings" ADD CONSTRAINT "session_recordings_intervention_session_id_fkey" FOREIGN KEY ("intervention_session_id") REFERENCES "intervention_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_recordings" ADD CONSTRAINT "session_recordings_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_recordings" ADD CONSTRAINT "session_recordings_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
