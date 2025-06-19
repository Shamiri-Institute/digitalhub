-- AlterEnum
ALTER TYPE "implementer_roles" ADD VALUE 'CLINICAL_TEAM';

-- CreateTable
CREATE TABLE "clinical_teams" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "cell_number" VARCHAR(255),
    "assigned_hub_id" VARCHAR(255),
    "implementer_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "clinical_teams_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "clinical_teams" ADD CONSTRAINT "clinical_teams_assigned_hub_id_fkey" FOREIGN KEY ("assigned_hub_id") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_teams" ADD CONSTRAINT "clinical_teams_implementer_id_fkey" FOREIGN KEY ("implementer_id") REFERENCES "implementers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
