
-- CreateTable
CREATE TABLE "ticket_reassignments" (
    "id" TEXT NOT NULL,
    "ticket_id" VARCHAR(255) NOT NULL,
    "escalation_id" VARCHAR(255) NOT NULL,
    "reassigned_from" VARCHAR(255) NOT NULL,
    "reassigned_to" VARCHAR(255) NOT NULL,
    "reassignment_reason" TEXT NOT NULL,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ticket_reassignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_reassignments_escalation_id_key" ON "ticket_reassignments"("escalation_id");

-- AddForeignKey
ALTER TABLE "ticket_reassignments" ADD CONSTRAINT "ticket_reassignments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_reassignments" ADD CONSTRAINT "ticket_reassignments_escalation_id_fkey" FOREIGN KEY ("escalation_id") REFERENCES "ticket_escalations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_reassignments" ADD CONSTRAINT "ticket_reassignments_reassigned_from_fkey" FOREIGN KEY ("reassigned_from") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_reassignments" ADD CONSTRAINT "ticket_reassignments_reassigned_to_fkey" FOREIGN KEY ("reassigned_to") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
