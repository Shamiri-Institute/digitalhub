-- CreateTable
CREATE TABLE "supervisor_complaints" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "project_id" TEXT NOT NULL,
    "supervisor_id" VARCHAR(255) NOT NULL,
    "absence_reason" TEXT NOT NULL,
    "absence_comments" TEXT,
    "hub_coordinator_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "supervisor_complaints_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "supervisor_complaints" ADD CONSTRAINT "supervisor_complaints_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_complaints" ADD CONSTRAINT "supervisor_complaints_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_complaints" ADD CONSTRAINT "supervisor_complaints_hub_coordinator_id_fkey" FOREIGN KEY ("hub_coordinator_id") REFERENCES "hub_coordinators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
