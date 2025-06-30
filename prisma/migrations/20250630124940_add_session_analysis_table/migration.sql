-- CreateTable
CREATE TABLE "session_analyses" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "archived_at" TIMESTAMPTZ,
    "session_id" TEXT NOT NULL,
    "protocol_adherence" INTEGER NOT NULL,
    "content_specifications" INTEGER NOT NULL,
    "content_thoroughness" INTEGER NOT NULL,
    "content_skillfulness" INTEGER NOT NULL,
    "content_clarity" INTEGER NOT NULL,
    "protocol_compliance" INTEGER NOT NULL,
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
