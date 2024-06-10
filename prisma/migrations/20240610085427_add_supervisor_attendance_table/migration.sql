-- CreateTable
CREATE TABLE "supervisor_attendances" (
    "id" TEXT NOT NULL,
    "visible_id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "project_id" TEXT NOT NULL,
    "school_id" VARCHAR(255) NOT NULL,
    "supervisor_id" VARCHAR(255) NOT NULL,
    "attended" BOOLEAN,
    "absence_reason" TEXT,
    "absence_comments" TEXT,
    "session_id" TEXT NOT NULL,

    CONSTRAINT "supervisor_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supervisor_attendances_visible_id_key" ON "supervisor_attendances"("visible_id");

-- AddForeignKey
ALTER TABLE "supervisor_attendances" ADD CONSTRAINT "supervisor_attendances_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_attendances" ADD CONSTRAINT "supervisor_attendances_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_attendances" ADD CONSTRAINT "supervisor_attendances_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_attendances" ADD CONSTRAINT "supervisor_attendances_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "intervention_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
