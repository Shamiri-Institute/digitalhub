-- CreateTable
CREATE TABLE "fellow_payment_complaints" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "date_of_complaint" TIMESTAMPTZ,
    "reason" VARCHAR(255) NOT NULL,
    "statement" VARCHAR(255) NOT NULL,
    "confirmed_amount_received" INTEGER,
    "difference_in_amount" INTEGER,
    "status" "approval_status" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "reason_for_rejection" TEXT,
    "reason_for_acceptance" TEXT,
    "fellow_attendance_id" INTEGER NOT NULL,

    CONSTRAINT "fellow_payment_complaints_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fellow_payment_complaints" ADD CONSTRAINT "fellow_payment_complaints_fellow_attendance_id_fkey" FOREIGN KEY ("fellow_attendance_id") REFERENCES "fellow_attendances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
