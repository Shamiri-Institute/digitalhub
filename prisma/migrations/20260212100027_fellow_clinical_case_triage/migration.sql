-- CreateEnum
CREATE TYPE "risk_screen_outcomes" AS ENUM ('ALL_NO', 'ANY_YES', 'NOT_COMPLETED');

-- CreateEnum
CREATE TYPE "risk_not_completed_reasons" AS ENUM ('STUDENT_LEFT', 'NO_PRIVACY', 'TIME_CONSTRAINTS', 'OTHER');

-- CreateEnum
CREATE TYPE "triage_action_taken" AS ENUM ('SUPPORTED', 'REFERRED', 'ESCALATED', 'REFUSED', 'INTERRUPTED');

-- CreateEnum
CREATE TYPE "supervisor_handoff_statuses" AS ENUM ('WARM_HANDOFF', 'SUPERVISOR_NOTIFIED', 'COULD_NOT_REACH', 'STUDENT_REFUSED_NOTIFIED');

-- CreateTable
CREATE TABLE "triage_events" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "student_attendance_id" INTEGER,
    "session_id" VARCHAR(255) NOT NULL,
    "student_id" VARCHAR(255) NOT NULL,
    "fellow_id" VARCHAR(255) NOT NULL,
    "hub_id" VARCHAR(255),
    "triage_occurred" BOOLEAN NOT NULL,
    "risk_screen_outcome" "risk_screen_outcomes",
    "risk_not_completed_reason" "risk_not_completed_reasons",
    "action_taken" "triage_action_taken",
    "referred_supervisor_id" VARCHAR(255),
    "supervisor_handoff_status" "supervisor_handoff_statuses",
    "note" VARCHAR(500),
    "metadata" JSONB,

    CONSTRAINT "triage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triage_event_audits" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triage_event_id" VARCHAR(255) NOT NULL,
    "edited_by_id" VARCHAR(255) NOT NULL,
    "before_data" JSONB,
    "after_data" JSONB,

    CONSTRAINT "triage_event_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "triage_events_student_attendance_id_key" ON "triage_events"("student_attendance_id");

-- CreateIndex
CREATE UNIQUE INDEX "triage_events_student_id_session_id_key" ON "triage_events"("student_id", "session_id");

-- AddForeignKey
ALTER TABLE "triage_events" ADD CONSTRAINT "triage_events_student_attendance_id_fkey" FOREIGN KEY ("student_attendance_id") REFERENCES "student_attendances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_events" ADD CONSTRAINT "triage_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "intervention_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_events" ADD CONSTRAINT "triage_events_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_events" ADD CONSTRAINT "triage_events_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "fellows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_events" ADD CONSTRAINT "triage_events_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_events" ADD CONSTRAINT "triage_events_referred_supervisor_id_fkey" FOREIGN KEY ("referred_supervisor_id") REFERENCES "supervisors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_event_audits" ADD CONSTRAINT "triage_event_audits_triage_event_id_fkey" FOREIGN KEY ("triage_event_id") REFERENCES "triage_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_event_audits" ADD CONSTRAINT "triage_event_audits_edited_by_id_fkey" FOREIGN KEY ("edited_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
