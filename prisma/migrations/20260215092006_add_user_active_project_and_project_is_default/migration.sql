-- AlterTable
ALTER TABLE "users" ADD COLUMN "active_project_id" VARCHAR(255);

-- AlterTable
ALTER TABLE "projects" ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_active_project_id_fkey" FOREIGN KEY ("active_project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
