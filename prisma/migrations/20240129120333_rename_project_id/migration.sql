-- DropForeignKey
ALTER TABLE "hubs" DROP CONSTRAINT "hubs_projectId_fkey";

-- RenameColumn
ALTER TABLE "hubs" RENAME COLUMN "projectId" TO "project_id";

-- AddForeignKey
ALTER TABLE "hubs" ADD CONSTRAINT "hubs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;