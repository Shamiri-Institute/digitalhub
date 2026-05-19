-- CreateTable
CREATE TABLE "attendance_documents" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file_name" VARCHAR(255) NOT NULL,
    "group_id" VARCHAR(255) NOT NULL,
    "session_id" VARCHAR(255) NOT NULL,
    "uploaded_by" VARCHAR(255) NOT NULL,
    "link" VARCHAR(255) NOT NULL,

    CONSTRAINT "attendance_documents_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "attendance_documents" ADD CONSTRAINT "attendance_documents_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "intervention_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_documents" ADD CONSTRAINT "attendance_documents_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "intervention_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_documents" ADD CONSTRAINT "attendance_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
