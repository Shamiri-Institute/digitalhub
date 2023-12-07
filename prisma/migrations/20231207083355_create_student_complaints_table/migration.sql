-- CreateTable
CREATE TABLE "student_complaints" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "supervisor_id" VARCHAR(255) NOT NULL,
    "student_id" VARCHAR(255) NOT NULL,
    "complaint" TEXT NOT NULL,

    CONSTRAINT "student_complaints_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "student_complaints" ADD CONSTRAINT "student_complaints_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_complaints" ADD CONSTRAINT "student_complaints_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
