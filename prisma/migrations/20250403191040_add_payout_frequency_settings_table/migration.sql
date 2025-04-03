-- CreateTable
CREATE TABLE "payout_frequency_settings" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "frequency" TEXT NOT NULL,
    "days" TEXT[],
    "time" TEXT NOT NULL,

    CONSTRAINT "payout_frequency_settings_pkey" PRIMARY KEY ("id")
);
