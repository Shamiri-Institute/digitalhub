-- CreateTable
CREATE TABLE "PayoutStatements" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "fellow_attendance_id" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "executed_at" TIMESTAMPTZ,
    "mpesa_number" TEXT,

    CONSTRAINT "PayoutStatements_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PayoutStatements" ADD CONSTRAINT "PayoutStatements_fellow_attendance_id_fkey" FOREIGN KEY ("fellow_attendance_id") REFERENCES "fellow_attendances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutStatements" ADD CONSTRAINT "PayoutStatements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
