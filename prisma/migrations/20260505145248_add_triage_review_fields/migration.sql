-- AlterTable
ALTER TABLE "triage_events" ADD COLUMN     "review_note" VARCHAR(300),
ADD COLUMN     "reviewed_at" TIMESTAMPTZ,
ADD COLUMN     "reviewed_by_id" VARCHAR(255);

-- AddForeignKey
ALTER TABLE "triage_events" ADD CONSTRAINT "triage_events_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
