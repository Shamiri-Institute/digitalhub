/*
  Warnings:

  - You are about to drop the column `actual_end_date` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `actual_start_date` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `estimated_end_date` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `estimated_start_date` on the `projects` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "projects" DROP COLUMN "actual_end_date",
DROP COLUMN "actual_start_date",
DROP COLUMN "estimated_end_date",
DROP COLUMN "estimated_start_date",
ADD COLUMN     "end_date" DATE,
ADD COLUMN     "start_date" DATE;

-- CreateTable
CREATE TABLE "project_payment_rates" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "training_session" INTEGER NOT NULL,
    "pre_session" INTEGER NOT NULL,
    "main_session" INTEGER NOT NULL,
    "supervision_session" INTEGER NOT NULL,
    "project_id" TEXT NOT NULL,

    CONSTRAINT "project_payment_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_payment_rates_project_id_key" ON "project_payment_rates"("project_id");

-- AddForeignKey
ALTER TABLE "project_payment_rates" ADD CONSTRAINT "project_payment_rates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
