/*
  Warnings:

  - A unique constraint covering the columns `[session_id,supervisor_id]` on the table `intervention_session_notes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `supervisor_id` to the `intervention_session_notes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "intervention_session_notes" ADD COLUMN     "supervisor_id" VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "intervention_session_notes_session_id_supervisor_id_key" ON "intervention_session_notes"("session_id", "supervisor_id");

-- AddForeignKey
ALTER TABLE "intervention_session_notes" ADD CONSTRAINT "intervention_session_notes_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
