/*
  Warnings:

  - A unique constraint covering the columns `[visible_id]` on the table `intervention_group_sessions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `visible_id` to the `intervention_group_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "intervention_group_sessions" ADD COLUMN     "visible_id" VARCHAR(100) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "intervention_group_sessions_visible_id_key" ON "intervention_group_sessions"("visible_id");
