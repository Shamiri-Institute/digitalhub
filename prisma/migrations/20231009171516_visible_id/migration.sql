/*
  Warnings:

  - A unique constraint covering the columns `[visible_id]` on the table `hubs` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `visible_id` to the `hubs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "hubs" ADD COLUMN     "visible_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "hubs_visible_id_key" ON "hubs"("visible_id");
