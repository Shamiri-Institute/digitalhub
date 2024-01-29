-- CreateTable
CREATE TABLE "weekly_fellow_ratings" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "behaviour_notes" TEXT NOT NULL,
    "program_delivery_notes" TEXT NOT NULL,
    "dressing_and_grooming_notes" TEXT NOT NULL,
    "attendance_notes" TEXT NOT NULL,
    "fellow_id" VARCHAR(255) NOT NULL,
    "supervisor_id" TEXT NOT NULL,

    CONSTRAINT "weekly_fellow_ratings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "weekly_fellow_ratings" ADD CONSTRAINT "weekly_fellow_ratings_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "fellows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_fellow_ratings" ADD CONSTRAINT "weekly_fellow_ratings_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
