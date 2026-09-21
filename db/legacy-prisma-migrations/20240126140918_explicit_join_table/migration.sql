-- CreateTable
CREATE TABLE "project_implementers" (
    "projectId" TEXT NOT NULL,
    "implementerId" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "project_implementers_projectId_implementerId_key" ON "project_implementers"("projectId", "implementerId");

-- AddForeignKey
ALTER TABLE "project_implementers" ADD CONSTRAINT "project_implementers_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_implementers" ADD CONSTRAINT "project_implementers_implementerId_fkey" FOREIGN KEY ("implementerId") REFERENCES "implementers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
