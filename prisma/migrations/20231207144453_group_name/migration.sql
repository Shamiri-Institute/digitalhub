/*
  Warnings:

  - You are about to drop the column `visible_id` on the `intervention_group_sessions` table. All the data in the column will be lost.
  - Added the required column `group_name` to the `intervention_group_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "intervention_group_sessions_visible_id_key";

-- AlterTable
ALTER TABLE "intervention_group_sessions" DROP COLUMN "visible_id",
ADD COLUMN     "group_name" VARCHAR(100) NOT NULL;
