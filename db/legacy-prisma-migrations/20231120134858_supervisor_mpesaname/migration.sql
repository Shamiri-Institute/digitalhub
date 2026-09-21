/*
  Warnings:

  - You are about to alter the column `mpesa_number` on the `supervisors` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(20)`.

*/
-- AlterTable
ALTER TABLE "supervisors" ADD COLUMN     "mpesa_name" VARCHAR(255),
ALTER COLUMN "mpesa_number" SET DATA TYPE VARCHAR(20);
