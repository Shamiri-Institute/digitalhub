-- CreateTable
CREATE TABLE "session_analyses" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "archived_at" TIMESTAMPTZ,
    "session_id" TEXT NOT NULL,
    "fellow_id" TEXT NOT NULL,
    "protocol_adherence" INTEGER NOT NULL,
    "content_specifications" INTEGER NOT NULL,
    "content_thoroughness" INTEGER NOT NULL,
    "content_skillfulness" INTEGER NOT NULL,
    "content_clarity" INTEGER NOT NULL,
    "protocol_compliance" INTEGER NOT NULL,
    "protocol_adherence_justification" TEXT,
    "content_specifications_justification" TEXT,
    "content_thoroughness_justification" TEXT,
    "content_skillfulness_justification" TEXT,
    "content_clarity_justification" TEXT,
    "protocol_compliance_justification" TEXT,
    "overall_score" TEXT,
    "overall_assessment" TEXT,
    "session_summary" TEXT,
    "strengths_json" JSONB,
    "areas_for_improvement_json" JSONB,
    "session_flow_engagement" TEXT,
    "safety_flags_json" JSONB,
    "recommendations_json" JSONB,
    "transcript_json" TEXT,
    "audio_features_json" JSONB,
    "analysis_date" TIMESTAMPTZ(6),
    "analysis_version" VARCHAR(50),

    CONSTRAINT "session_analyses_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "session_analyses" ADD CONSTRAINT "session_analyses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "intervention_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_analyses" ADD CONSTRAINT "session_analyses_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "fellows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
