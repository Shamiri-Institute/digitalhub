-- CreateTable
CREATE TABLE "student_group_transfer_trail" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "student_id" TEXT NOT NULL,
    "current_group_id" TEXT NOT NULL,
    "from_group_id" TEXT,

    CONSTRAINT "student_group_transfer_trail_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "student_group_transfer_trail" ADD CONSTRAINT "student_group_transfer_trail_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
