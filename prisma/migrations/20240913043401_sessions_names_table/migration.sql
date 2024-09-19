/*
  Warnings:

  - A unique constraint covering the columns `[school_id,session_id]` on the table `intervention_sessions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "session_types" AS ENUM ('INTERVENTION', 'SUPERVISION', 'TRAINING', 'SPECIAL', 'CLINICAL', 'DATA_COLLECTION');

-- AlterTable
ALTER TABLE "intervention_sessions" ADD COLUMN     "session_id" VARCHAR(255),
ALTER COLUMN "session_name" DROP NOT NULL,
ALTER COLUMN "session_type" DROP NOT NULL;

-- CreateTable
CREATE TABLE "session_names" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "sessionType" "session_types" NOT NULL,
    "session_name" VARCHAR(255) NOT NULL,
    "amount" INTEGER,
    "currency" VARCHAR(100) NOT NULL DEFAULT 'KES',
    "hub_id" VARCHAR(255) NOT NULL,
    "session_label" VARCHAR(255) NOT NULL,

    CONSTRAINT "session_names_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "intervention_sessions_school_id_session_id_key" ON "intervention_sessions"("school_id", "session_id");

-- AddForeignKey
ALTER TABLE "intervention_sessions" ADD CONSTRAINT "intervention_sessions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session_names"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_names" ADD CONSTRAINT "session_names_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
