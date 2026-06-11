-- CreateEnum
CREATE TYPE "ticket_priority_level" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ticket_category" AS ENUM ('TECH', 'RESEARCH', 'OPERATIONS', 'CARE', 'CLINICAL');

-- CreateEnum
CREATE TYPE "ticket_status" AS ENUM ('OPEN', 'ESCALATED', 'RESOLVED', 'CANCELLED');

-- AlterTable
ALTER TABLE "attendance_documents" ALTER COLUMN "archived_at" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "visible_id" SERIAL NOT NULL,
    "created_by" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "ticket_priority_level" NOT NULL DEFAULT 'MEDIUM',
    "category" "ticket_category" NOT NULL,
    "status" "ticket_status" NOT NULL DEFAULT 'OPEN',
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_escalations" (
    "id" TEXT NOT NULL,
    "ticket_id" VARCHAR(255) NOT NULL,
    "escalated_by" VARCHAR(255) NOT NULL,
    "escalated_to" VARCHAR(255) NOT NULL,
    "escalation_reason" TEXT NOT NULL,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_escalations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tickets_visible_id_key" ON "tickets"("visible_id");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_escalations" ADD CONSTRAINT "ticket_escalations_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_escalations" ADD CONSTRAINT "ticket_escalations_escalated_by_fkey" FOREIGN KEY ("escalated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_escalations" ADD CONSTRAINT "ticket_escalations_escalated_to_fkey" FOREIGN KEY ("escalated_to") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
