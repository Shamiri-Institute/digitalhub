/*
  Warnings:

  - Added the required column `link` to the `fellow_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `link` to the `school_documents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "fellow_documents" ADD COLUMN     "link" VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE "school_documents" ADD COLUMN     "link" VARCHAR(255) NOT NULL;
