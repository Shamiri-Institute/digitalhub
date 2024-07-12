-- CreateTable
CREATE TABLE "weekly_team_meeting_reports" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "logistics_related_issues" TEXT NOT NULL,
    "logistics_related_issues_rating" INTEGER NOT NULL,
    "relationship_management" TEXT NOT NULL,
    "relationship_management_rating" INTEGER NOT NULL,
    "digital_hub_issues" TEXT NOT NULL,
    "digital_hub_issues_rating" INTEGER NOT NULL,
    "any_other_challenges" TEXT NOT NULL,
    "any_other_challenges_rating" INTEGER NOT NULL,
    "recommendations" TEXT NOT NULL,
    "week" DATE NOT NULL,
    "submitted_by" VARCHAR(255) NOT NULL,
    "hub_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "weekly_team_meeting_reports_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "weekly_team_meeting_reports" ADD CONSTRAINT "weekly_team_meeting_reports_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "hub_coordinators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_team_meeting_reports" ADD CONSTRAINT "weekly_team_meeting_reports_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
