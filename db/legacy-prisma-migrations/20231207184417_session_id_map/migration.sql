/*
  Warnings:

  - You are about to drop the column `archived_at` on the `fellow_attendances` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `intervention_group_sessions` table. All the data in the column will be lost.
  - Added the required column `session_id` to the `intervention_group_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "intervention_group_sessions" DROP CONSTRAINT "intervention_group_sessions_sessionId_fkey";

-- AlterTable
ALTER TABLE "fellow_attendances" DROP COLUMN "archived_at",
ADD COLUMN     "group_session_id" VARCHAR(255);

-- AlterTable
ALTER TABLE "intervention_group_sessions" DROP COLUMN "sessionId",
ADD COLUMN     "session_id" VARCHAR(255) NOT NULL;

-- AddForeignKey
ALTER TABLE "fellow_attendances" ADD CONSTRAINT "fellow_attendances_group_session_id_fkey" FOREIGN KEY ("group_session_id") REFERENCES "intervention_group_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_group_sessions" ADD CONSTRAINT "intervention_group_sessions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "intervention_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
