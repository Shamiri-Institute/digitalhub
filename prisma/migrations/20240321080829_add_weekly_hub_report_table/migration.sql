-- CreateTable
CREATE TABLE "weekly_hub_reports" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "positive_highlights" TEXT NOT NULL,
    "reported_challenges" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "week" DATE NOT NULL,
    "submitted_by" VARCHAR(255) NOT NULL,
    "hub_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "weekly_hub_reports_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "weekly_hub_reports" ADD CONSTRAINT "weekly_hub_reports_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "hub_coordinators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_hub_reports" ADD CONSTRAINT "weekly_hub_reports_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
