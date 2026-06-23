-- AlterTable
ALTER TABLE "ticket_escalations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tickets" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ticket_resolutions" (
    "id" TEXT NOT NULL,
    "ticket_id" VARCHAR(255) NOT NULL,
    "resolved_by" VARCHAR(255) NOT NULL,
    "resolution_reason" TEXT NOT NULL,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ticket_resolutions_pkey" PRIMARY KEY ("id")
);

-- AddUniqueConstraint
ALTER TABLE "ticket_resolutions" ADD CONSTRAINT "ticket_resolutions_ticket_id_key" UNIQUE ("ticket_id");

-- AddForeignKey
ALTER TABLE "ticket_resolutions" ADD CONSTRAINT "ticket_resolutions_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_resolutions" ADD CONSTRAINT "ticket_resolutions_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
