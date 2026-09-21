-- AlterTable
ALTER TABLE "hubs" ADD COLUMN     "projectId" VARCHAR(100);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "visible_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "project_lead" VARCHAR(255),
    "implementer_id" VARCHAR(255) NOT NULL,
    "funder" VARCHAR(255),
    "budget" INTEGER,
    "phase" INTEGER,
    "estimated_start_date" DATE,
    "estimated_end_date" DATE,
    "actual_start_date" DATE,
    "actual_end_date" DATE,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "hubs" ADD CONSTRAINT "hubs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "implementers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
