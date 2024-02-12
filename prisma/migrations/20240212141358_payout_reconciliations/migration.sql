-- CreateTable
CREATE TABLE "payout_reconciliations" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "executed_at" TIMESTAMPTZ,
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'KES',
    "description" TEXT,
    "fellowId" TEXT NOT NULL,
    "relatedDetails" JSONB,

    CONSTRAINT "payout_reconciliations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "payout_reconciliations" ADD CONSTRAINT "payout_reconciliations_fellowId_fkey" FOREIGN KEY ("fellowId") REFERENCES "fellows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
