/*
  Warnings:

  - You are about to drop the `FellowComplaints` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FellowComplaints" DROP CONSTRAINT "FellowComplaints_fellow_id_fkey";

-- DropForeignKey
ALTER TABLE "FellowComplaints" DROP CONSTRAINT "FellowComplaints_supervisor_id_fkey";

-- DropTable
DROP TABLE "FellowComplaints";

-- CreateTable
CREATE TABLE "fellow_complaints" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "complaint" TEXT NOT NULL,
    "supervisor_id" VARCHAR(255) NOT NULL,
    "fellow_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "fellow_complaints_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fellow_complaints" ADD CONSTRAINT "fellow_complaints_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellow_complaints" ADD CONSTRAINT "fellow_complaints_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "fellows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
