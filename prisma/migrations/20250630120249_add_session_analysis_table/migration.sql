-- CreateTable
CREATE TABLE "session_analyses" (
    "id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "session_id" VARCHAR(255) NOT NULL,
    "protocol_adherence" INTEGER,
    "content_specifications" INTEGER,
    "content_thoroughness" INTEGER,
    "content_skillfulness" INTEGER,
    "content_clarity" INTEGER,
    "protocol_compliance" INTEGER,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "flags" TEXT,
    "overall_summary" TEXT,
    "analysis_date" TIMESTAMPTZ(6),
    "transcription_url" TEXT,
    "audio_url" TEXT,
    "analysis_version" VARCHAR(50),

    CONSTRAINT "session_analyses_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "session_analyses" ADD CONSTRAINT "session_analyses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "intervention_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
