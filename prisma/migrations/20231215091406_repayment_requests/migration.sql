-- CreateTable
CREATE TABLE "repayment_requests" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "supervisor_id" VARCHAR(255) NOT NULL,
    "fellow_id" VARCHAR(255) NOT NULL,
    "hub_id" VARCHAR(255) NOT NULL,
    "group_session_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "repayment_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "repayment_requests" ADD CONSTRAINT "repayment_requests_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayment_requests" ADD CONSTRAINT "repayment_requests_fellow_id_fkey" FOREIGN KEY ("fellow_id") REFERENCES "fellows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayment_requests" ADD CONSTRAINT "repayment_requests_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayment_requests" ADD CONSTRAINT "repayment_requests_group_session_id_fkey" FOREIGN KEY ("group_session_id") REFERENCES "intervention_group_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
