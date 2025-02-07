/*
  Warnings:

  - You are about to drop the `school_implementers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "school_implementers" DROP CONSTRAINT "school_implementers_implementerId_fkey";

-- DropForeignKey
ALTER TABLE "school_implementers" DROP CONSTRAINT "school_implementers_schoolId_fkey";

-- DropTable
DROP TABLE "school_implementers";
