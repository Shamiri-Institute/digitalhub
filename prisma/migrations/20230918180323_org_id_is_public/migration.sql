/*
  Warnings:

  - The primary key for the `organization_logos` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "organization_logos" DROP CONSTRAINT "organization_logos_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "organization_logos_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "organization_logos_id_seq";
