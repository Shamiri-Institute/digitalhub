/*
  Warnings:

  - You are about to drop the column `project_id` on the `hubs` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[session_name,project_id]` on the table `session_names` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "hubs" DROP CONSTRAINT "hubs_project_id_fkey";

-- AlterTable
ALTER TABLE "hubs" DROP COLUMN "project_id";

-- AlterTable
ALTER TABLE "session_names" ADD COLUMN     "project_id" VARCHAR(255);

-- CreateTable
CREATE TABLE "_HubToProject" (
    "A" VARCHAR(255) NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_HubToProject_AB_unique" ON "_HubToProject"("A", "B");

-- CreateIndex
CREATE INDEX "_HubToProject_B_index" ON "_HubToProject"("B");

-- CreateIndex
CREATE UNIQUE INDEX "session_names_session_name_project_id_key" ON "session_names"("session_name", "project_id");

-- AddForeignKey
ALTER TABLE "session_names" ADD CONSTRAINT "session_names_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HubToProject" ADD CONSTRAINT "_HubToProject_A_fkey" FOREIGN KEY ("A") REFERENCES "hubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HubToProject" ADD CONSTRAINT "_HubToProject_B_fkey" FOREIGN KEY ("B") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
