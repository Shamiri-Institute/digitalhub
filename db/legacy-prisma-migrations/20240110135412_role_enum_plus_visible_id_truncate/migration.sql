/*
  Warnings:

  - The values [DELIVER] on the enum `implementer_roles` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `FellowReportingNotes` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "implementer_roles_new" AS ENUM ('ADMIN', 'HUB_COORDINATOR', 'SUPERVISOR', 'OPERATIONS');
ALTER TABLE "implementer_members" ALTER COLUMN "role" TYPE "implementer_roles_new" USING ("role"::text::"implementer_roles_new");
ALTER TABLE "implementer_invites" ALTER COLUMN "implementer_role" TYPE "implementer_roles_new" USING ("implementer_role"::text::"implementer_roles_new");
ALTER TYPE "implementer_roles" RENAME TO "implementer_roles_old";
ALTER TYPE "implementer_roles_new" RENAME TO "implementer_roles";
DROP TYPE "implementer_roles_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "FellowReportingNotes" DROP CONSTRAINT "FellowReportingNotes_fellow_id_fkey";

-- DropForeignKey
ALTER TABLE "FellowReportingNotes" DROP CONSTRAINT "FellowReportingNotes_supervisor_id_fkey";

-- AlterTable
ALTER TABLE "hub_coordinators" ALTER COLUMN "visible_id" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "hubs" ALTER COLUMN "visible_id" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "implementers" ALTER COLUMN "visible_id" SET DATA TYPE VARCHAR(100);

-- DropTable
DROP TABLE "FellowReportingNotes";

-- CreateTable
CREATE TABLE "fellow_reporting_notes" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "supervisor_id" VARCHAR(255) NOT NULL,
    "fellow_id" VARCHAR(255) NOT NULL,
    "notes" TEXT NOT NULL,

    CONSTRAINT "fellow_reporting_notes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fellow_reporting_notes" ADD CONSTRAINT "fellow_reporting_notes_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fellow_reporting_notes" ADD CONSTRAINT "fellow_reporting_notes_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "fellows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
