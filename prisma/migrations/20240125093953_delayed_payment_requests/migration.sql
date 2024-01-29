-- CreateTable
CREATE TABLE "delayed_payment_requests" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "fellow_id" VARCHAR(255) NOT NULL,
    "supervisor_id" VARCHAR(255) NOT NULL,
    "intervention_session_id" VARCHAR(255) NOT NULL,
    "fellow_attendance_id" INTEGER NOT NULL,

    CONSTRAINT "delayed_payment_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "delayed_payment_requests" ADD CONSTRAINT "delayed_payment_requests_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "fellows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delayed_payment_requests" ADD CONSTRAINT "delayed_payment_requests_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delayed_payment_requests" ADD CONSTRAINT "delayed_payment_requests_intervention_session_id_fkey" FOREIGN KEY ("intervention_session_id") REFERENCES "intervention_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delayed_payment_requests" ADD CONSTRAINT "delayed_payment_requests_fellow_attendance_id_fkey" FOREIGN KEY ("fellow_attendance_id") REFERENCES "fellow_attendances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
