/*
  Warnings:

  - The primary key for the `project_implementers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `implementerId` on the `project_implementers` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `project_implementers` table. All the data in the column will be lost.
  - You are about to drop the `_ImplementerToProject` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `implementer_id` to the `project_implementers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `project_id` to the `project_implementers` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_ImplementerToProject" DROP CONSTRAINT "_ImplementerToProject_A_fkey";

-- DropForeignKey
ALTER TABLE "_ImplementerToProject" DROP CONSTRAINT "_ImplementerToProject_B_fkey";

-- DropForeignKey
ALTER TABLE "project_implementers" DROP CONSTRAINT "project_implementers_implementerId_fkey";

-- DropForeignKey
ALTER TABLE "project_implementers" DROP CONSTRAINT "project_implementers_projectId_fkey";

-- AlterTable
ALTER TABLE "project_implementers" DROP CONSTRAINT "project_implementers_pkey",
DROP COLUMN "implementerId",
DROP COLUMN "projectId",
ADD COLUMN     "implementer_id" VARCHAR(255) NOT NULL,
ADD COLUMN     "project_id" VARCHAR(255) NOT NULL,
ADD CONSTRAINT "project_implementers_pkey" PRIMARY KEY ("project_id", "implementer_id");

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "date_of_birth" TIMESTAMPTZ;

-- DropTable
DROP TABLE "_ImplementerToProject";

-- AddForeignKey
ALTER TABLE "project_implementers" ADD CONSTRAINT "project_implementers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_implementers" ADD CONSTRAINT "project_implementers_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "implementers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
