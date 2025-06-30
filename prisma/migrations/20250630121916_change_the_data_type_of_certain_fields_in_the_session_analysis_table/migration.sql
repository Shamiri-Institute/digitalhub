/*
  Warnings:

  - The primary key for the `session_analyses` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "session_analyses" DROP CONSTRAINT "session_analyses_session_id_fkey";

-- AlterTable
ALTER TABLE "session_analyses" DROP CONSTRAINT "session_analyses_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "archived_at" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "session_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "session_analyses_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "session_analyses" ADD CONSTRAINT "session_analyses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "intervention_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
