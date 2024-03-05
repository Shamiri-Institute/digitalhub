-- CreateTable
CREATE TABLE "intervention_group_reports" (
    "id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "group_id" VARCHAR(255) NOT NULL,
    "e1" INTEGER,
    "e2" INTEGER,
    "e3" INTEGER,
    "e_comment" TEXT,
    "c1" INTEGER,
    "c2" INTEGER,
    "c3" INTEGER,
    "c_comment" TEXT,
    "content" INTEGER,
    "content_comment" TEXT,
    "intervention_session_id" TEXT,
    "is_all_report" BOOLEAN,

    CONSTRAINT "intervention_group_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "intervention_group_reports_intervention_session_id_key" ON "intervention_group_reports"("intervention_session_id");

-- AddForeignKey
ALTER TABLE "intervention_group_reports" ADD CONSTRAINT "intervention_group_reports_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "intervention_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_group_reports" ADD CONSTRAINT "intervention_group_reports_intervention_session_id_fkey" FOREIGN KEY ("intervention_session_id") REFERENCES "intervention_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
