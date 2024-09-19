-- CreateEnum
CREATE TYPE "approval_status" AS ENUM ('PENDING', 'REJECTED', 'APPROVED');

-- CreateTable
CREATE TABLE "payout_statements" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "fellow_attendance_id" INTEGER NOT NULL,
    "fellow_id" VARCHAR(255) NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "executed_at" TIMESTAMPTZ,
    "mpesa_number" TEXT,
    "special_payout_request_id" TEXT,

    CONSTRAINT "payout_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "special_session_approval_requests" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMPTZ,
    "rejected_at" TIMESTAMPTZ,
    "amount" INTEGER NOT NULL,
    "created_by" TEXT NOT NULL,
    "fellow_attendance_id" INTEGER NOT NULL,
    "status" "approval_status" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "special_session_approval_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "payout_statements" ADD CONSTRAINT "payout_statements_fellow_attendance_id_fkey" FOREIGN KEY ("fellow_attendance_id") REFERENCES "fellow_attendances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_statements" ADD CONSTRAINT "payout_statements_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "fellows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_statements" ADD CONSTRAINT "payout_statements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_statements" ADD CONSTRAINT "payout_statements_special_payout_request_id_fkey" FOREIGN KEY ("special_payout_request_id") REFERENCES "special_session_approval_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_session_approval_requests" ADD CONSTRAINT "special_session_approval_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "hub_coordinators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_session_approval_requests" ADD CONSTRAINT "special_session_approval_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_session_approval_requests" ADD CONSTRAINT "special_session_approval_requests_fellow_attendance_id_fkey" FOREIGN KEY ("fellow_attendance_id") REFERENCES "fellow_attendances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
