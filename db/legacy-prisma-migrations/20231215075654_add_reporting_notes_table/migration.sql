-- CreateTable
CREATE TABLE "FellowReportingNotes" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "supervisor_id" VARCHAR(255) NOT NULL,
    "fellow_id" VARCHAR(255) NOT NULL,
    "notes" TEXT NOT NULL,

    CONSTRAINT "FellowReportingNotes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FellowReportingNotes" ADD CONSTRAINT "FellowReportingNotes_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FellowReportingNotes" ADD CONSTRAINT "FellowReportingNotes_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "fellows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
