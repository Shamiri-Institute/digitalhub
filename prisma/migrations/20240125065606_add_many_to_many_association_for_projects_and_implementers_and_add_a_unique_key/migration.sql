/*
  Warnings:

  - A unique constraint covering the columns `[visible_id]` on the table `projects` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_implementer_id_fkey";

-- CreateTable
CREATE TABLE "_ImplementerToProjects" (
    "A" VARCHAR(255) NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ImplementerToProjects_AB_unique" ON "_ImplementerToProjects"("A", "B");

-- CreateIndex
CREATE INDEX "_ImplementerToProjects_B_index" ON "_ImplementerToProjects"("B");

-- CreateIndex
CREATE UNIQUE INDEX "projects_visible_id_key" ON "projects"("visible_id");

-- AddForeignKey
ALTER TABLE "_ImplementerToProjects" ADD CONSTRAINT "_ImplementerToProjects_A_fkey" FOREIGN KEY ("A") REFERENCES "implementers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ImplementerToProjects" ADD CONSTRAINT "_ImplementerToProjects_B_fkey" FOREIGN KEY ("B") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
