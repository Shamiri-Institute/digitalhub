SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
ALTER TABLE "clinical_case_notes" DROP CONSTRAINT "clinical_case_notes_case_id_fkey";
--> statement-breakpoint
ALTER TABLE "clinical_case_termination" DROP CONSTRAINT "clinical_case_termination_case_id_fkey";
--> statement-breakpoint
DROP INDEX "clinical_case_notes_case_id_session_id_key";--> statement-breakpoint
-- ENG-2399: a superseded draft of the note on this session, saved with the wrong case.
DELETE FROM "clinical_case_notes" WHERE "id" = 'casenote_01kjzp345yfmvr940a077n2vkv';--> statement-breakpoint
CREATE UNIQUE INDEX "clinical_case_notes_session_id_key" ON "clinical_case_notes" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "clinical_case_termination_session_id_idx" ON "clinical_case_termination" USING btree ("session_id");--> statement-breakpoint
ALTER TABLE "clinical_case_notes" DROP COLUMN "case_id";--> statement-breakpoint
ALTER TABLE "clinical_case_termination" DROP COLUMN "case_id";