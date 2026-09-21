-- AlterTable
ALTER TABLE "intervention_sessions" ADD COLUMN     "hub_id" VARCHAR(255);

-- AddForeignKey
ALTER TABLE "intervention_sessions" ADD CONSTRAINT "intervention_sessions_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
