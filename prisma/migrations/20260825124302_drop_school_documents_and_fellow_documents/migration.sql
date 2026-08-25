/*
  Warnings:

  - You are about to drop the `fellow_documents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `school_documents` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "fellow_documents" DROP CONSTRAINT "fellow_documents_fellow_id_fkey";

-- DropForeignKey
ALTER TABLE "fellow_documents" DROP CONSTRAINT "fellow_documents_uploaded_by_fkey";

-- DropForeignKey
ALTER TABLE "school_documents" DROP CONSTRAINT "school_documents_school_id_fkey";

-- DropForeignKey
ALTER TABLE "school_documents" DROP CONSTRAINT "school_documents_uploaded_by_fkey";

-- DropTable
DROP TABLE "fellow_documents";

-- DropTable
DROP TABLE "school_documents";
