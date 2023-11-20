-- CreateTable
CREATE TABLE "reimbursement_requests" (
    "id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "kind" VARCHAR(255) NOT NULL,
    "status" VARCHAR(100) NOT NULL,
    "details" JSONB NOT NULL,

    CONSTRAINT "reimbursement_requests_pkey" PRIMARY KEY ("id")
);
