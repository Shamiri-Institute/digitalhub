/*
  Warnings:

  - You are about to drop the column `email` on the `fellows` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[visible_id]` on the table `fellows` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[fellow_email]` on the table `fellows` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `visible_id` to the `fellows` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "fellows_email_key";

-- AlterTable
ALTER TABLE "fellows" DROP COLUMN "email",
ADD COLUMN     "fellow_email" VARCHAR(255),
ADD COLUMN     "visible_id" VARCHAR(100) NOT NULL,
ALTER COLUMN "date_of_birth" SET DATA TYPE DATE;

-- CreateIndex
CREATE UNIQUE INDEX "fellows_visible_id_key" ON "fellows"("visible_id");

-- CreateIndex
CREATE UNIQUE INDEX "fellows_fellow_email_key" ON "fellows"("fellow_email");
