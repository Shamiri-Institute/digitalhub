-- CreateTable
CREATE TABLE "FellowComplaints" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "complaint" TEXT NOT NULL,
    "supervisor_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "FellowComplaints_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FellowComplaints" ADD CONSTRAINT "FellowComplaints_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
