/*
  Warnings:

  - You are about to drop the column `interventionSessionId` on the `intervention_group_sessions` table. All the data in the column will be lost.
  - Added the required column `sessionId` to the `intervention_group_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "intervention_group_sessions" DROP CONSTRAINT "intervention_group_sessions_interventionSessionId_fkey";

-- AlterTable
ALTER TABLE "intervention_group_sessions" DROP COLUMN "interventionSessionId",
ADD COLUMN     "sessionId" VARCHAR(255) NOT NULL;

-- CreateTable
CREATE TABLE "intervention_session_ratings" (
    "id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "session_id" VARCHAR(255) NOT NULL,
    "supervisor_id" VARCHAR(255) NOT NULL,
    "student_behavior_rating" INTEGER,
    "admin_support_rating" INTEGER,
    "workload_rating" INTEGER,

    CONSTRAINT "intervention_session_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intervention_session_notes" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "session_id" VARCHAR(255) NOT NULL,
    "kind" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "intervention_session_notes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "intervention_session_ratings" ADD CONSTRAINT "intervention_session_ratings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "intervention_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_session_ratings" ADD CONSTRAINT "intervention_session_ratings_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_session_notes" ADD CONSTRAINT "intervention_session_notes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "intervention_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_group_sessions" ADD CONSTRAINT "intervention_group_sessions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "intervention_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
