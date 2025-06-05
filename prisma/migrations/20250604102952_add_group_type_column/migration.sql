-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('TREATMENT', 'CONTROL');

-- AlterTable
ALTER TABLE "intervention_groups" ADD COLUMN     "group_type" "GroupType" NOT NULL DEFAULT 'TREATMENT';
