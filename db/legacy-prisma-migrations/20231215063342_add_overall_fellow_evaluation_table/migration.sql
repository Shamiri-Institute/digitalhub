-- CreateTable
CREATE TABLE "overall_fellow_evaluation" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMPTZ,
    "supervisor_id" VARCHAR(255) NOT NULL,
    "fellow_id" VARCHAR(255) NOT NULL,
    "fellow_behaviour_rating" INTEGER NOT NULL,
    "fellow_behaviour_notes" TEXT NOT NULL,
    "program_delivery_rating" INTEGER NOT NULL,
    "program_delivery_notes" TEXT NOT NULL,
    "dressing_and_grooming_rating" INTEGER NOT NULL,
    "dressing_and_grooming_notes" TEXT NOT NULL,
    "attendance_notes" TEXT NOT NULL,

    CONSTRAINT "overall_fellow_evaluation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "overall_fellow_evaluation" ADD CONSTRAINT "overall_fellow_evaluation_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overall_fellow_evaluation" ADD CONSTRAINT "overall_fellow_evaluation_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "fellows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
