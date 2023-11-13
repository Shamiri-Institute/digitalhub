/*
  Warnings:

  - You are about to drop the column `leader_id` on the `intervention_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `visible_id` on the `intervention_sessions` table. All the data in the column will be lost.
  - Added the required column `occurred` to the `intervention_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "intervention_sessions" DROP CONSTRAINT "intervention_sessions_leader_id_fkey";

-- DropIndex
DROP INDEX "intervention_sessions_visible_id_key";

-- AlterTable
ALTER TABLE "intervention_sessions" DROP COLUMN "leader_id",
DROP COLUMN "visible_id",
ADD COLUMN     "occurred" BOOLEAN NOT NULL;

-- CreateTable
CREATE TABLE "intervention_group_sessions" (
    "id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "leader_id" VARCHAR(255),
    "interventionSessionId" VARCHAR(255) NOT NULL,

    CONSTRAINT "intervention_group_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "unique_school_and_type_intervention_session" ON "intervention_sessions"("session_type", "school_id");

-- AddForeignKey
ALTER TABLE "intervention_group_sessions" ADD CONSTRAINT "intervention_group_sessions_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "fellows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_group_sessions" ADD CONSTRAINT "intervention_group_sessions_interventionSessionId_fkey" FOREIGN KEY ("interventionSessionId") REFERENCES "intervention_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
