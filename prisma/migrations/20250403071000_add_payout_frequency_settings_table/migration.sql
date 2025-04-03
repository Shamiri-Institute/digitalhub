-- CreateTable
CREATE TABLE "payout_frequency_settings" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "frequency" TEXT NOT NULL,
    "days" TEXT[],
    "time" TEXT NOT NULL,
    "project_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "payout_frequency_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payout_frequency_settings_project_id_key" ON "payout_frequency_settings"("project_id");

-- AddForeignKey
ALTER TABLE "payout_frequency_settings" ADD CONSTRAINT "payout_frequency_settings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
