SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
-- ENG-2399: a superseded draft of the note on this session, saved with the wrong case.
DELETE FROM "clinical_case_notes" WHERE "id" = 'casenote_01kjzp345yfmvr940a077n2vkv';
--> statement-breakpoint
-- Merge double-submitted sessions (same case, label and date) into one row: the row with a note,
-- else the row with a termination, else the newest. Three legacy sessions each hold a second,
-- different note on the same case, label and date; they stay and the unique index skips them.
CREATE TEMP TABLE "clinical_session_merge" ON COMMIT DROP AS
SELECT "id", "keeper_id"
FROM (
  SELECT
    a."id",
    first_value(a."id") OVER (
      PARTITION BY a."case_id", a."session", a."date"
      ORDER BY
        EXISTS (SELECT 1 FROM "clinical_case_notes" n WHERE n."session_id" = a."id") DESC,
        EXISTS (SELECT 1 FROM "clinical_case_termination" t WHERE t."session_id" = a."id") DESC,
        a."created_at" DESC,
        a."id" DESC
    ) AS "keeper_id"
  FROM "clinical_session_attendance" a
  WHERE a."id" NOT IN ('csess_01jxz4tc7pfzv9e2wc4sta5n9n', 'csess_01k0gwykc9ejg9znamq2dnys9d', 'csess_01kj3dq591e6xv54aanbf3vsfj')
) ranked
WHERE "id" <> "keeper_id";
--> statement-breakpoint
UPDATE "clinical_case_notes" n SET "session_id" = m."keeper_id"
FROM "clinical_session_merge" m WHERE n."session_id" = m."id";
--> statement-breakpoint
UPDATE "clinical_case_termination" t SET "session_id" = m."keeper_id"
FROM "clinical_session_merge" m WHERE t."session_id" = m."id";
--> statement-breakpoint
DELETE FROM "clinical_session_attendance" a USING "clinical_session_merge" m WHERE a."id" = m."id";
--> statement-breakpoint
-- A case has one termination: keep the newest, the reason the case was last terminated with.
DELETE FROM "clinical_case_termination" t
WHERE EXISTS (
  SELECT 1 FROM "clinical_case_termination" newer
  WHERE newer."case_id" = t."case_id"
    AND (newer."created_at", newer."id") > (t."created_at", t."id")
);
--> statement-breakpoint
-- Sessions marked before the typeid rewrite kept the old supervisor and clinical lead ids, because
-- the columns had no foreign key to cascade through. Old supervisor ids are supervisors.visible_id.
UPDATE "clinical_session_attendance" a SET "supervisor_id" = s."id"
FROM "supervisors" s
WHERE s."visible_id" = a."supervisor_id"
  AND NOT EXISTS (SELECT 1 FROM "supervisors" current WHERE current."id" = a."supervisor_id");
--> statement-breakpoint
-- An old clinical lead id maps to the case's clinical lead when every case it appears on has the same one.
UPDATE "clinical_session_attendance" a SET "clinical_lead_id" = mapped."clinical_lead_id"
FROM (
  SELECT old."clinical_lead_id" AS "old_id", min(c."clinical_lead_id") AS "clinical_lead_id"
  FROM "clinical_session_attendance" old
  JOIN "clinical_screening_info" c ON c."id" = old."case_id"
  JOIN "clinical_leads" cl ON cl."id" = c."clinical_lead_id"
  WHERE NOT EXISTS (SELECT 1 FROM "clinical_leads" current WHERE current."id" = old."clinical_lead_id")
  GROUP BY old."clinical_lead_id"
  HAVING count(DISTINCT c."clinical_lead_id") = 1
) mapped
WHERE a."clinical_lead_id" = mapped."old_id";
--> statement-breakpoint
UPDATE "clinical_session_attendance" a SET "supervisor_id" = NULL
WHERE a."supervisor_id" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "supervisors" s WHERE s."id" = a."supervisor_id");
--> statement-breakpoint
UPDATE "clinical_session_attendance" a SET "clinical_lead_id" = NULL
WHERE a."clinical_lead_id" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "clinical_leads" cl WHERE cl."id" = a."clinical_lead_id");
--> statement-breakpoint
ALTER TABLE "clinical_case_notes" DROP CONSTRAINT "clinical_case_notes_case_id_fkey";
--> statement-breakpoint
DROP INDEX "clinical_case_notes_case_id_session_id_key";
--> statement-breakpoint
CREATE UNIQUE INDEX "clinical_case_notes_session_id_key" ON "clinical_case_notes" USING btree ("session_id");
--> statement-breakpoint
ALTER TABLE "clinical_case_notes" DROP COLUMN "case_id";
--> statement-breakpoint
ALTER TABLE "clinical_session_attendance" ADD CONSTRAINT "clinical_session_attendance_session_check" CHECK (session IN ('Pre', 'S1', 'S2', 'S3', 'S4', 'F1', 'F2', 'F3', 'F4', 'F5'));
--> statement-breakpoint
CREATE UNIQUE INDEX "clinical_session_attendance_case_id_session_date_key" ON "clinical_session_attendance" USING btree ("case_id","session","date") WHERE id NOT IN ('csess_01jxz4tc7pfzv9e2wc4sta5n9n', 'csess_01k0gwykc9ejg9znamq2dnys9d', 'csess_01kj3dq591e6xv54aanbf3vsfj');
--> statement-breakpoint
CREATE UNIQUE INDEX "clinical_session_attendance_case_id_id_key" ON "clinical_session_attendance" USING btree ("case_id","id");
--> statement-breakpoint
CREATE INDEX "clinical_session_attendance_supervisor_id_idx" ON "clinical_session_attendance" USING btree ("supervisor_id");
--> statement-breakpoint
CREATE INDEX "clinical_session_attendance_clinical_lead_id_idx" ON "clinical_session_attendance" USING btree ("clinical_lead_id");
--> statement-breakpoint
ALTER TABLE "clinical_session_attendance" ADD CONSTRAINT "clinical_session_attendance_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "clinical_session_attendance" ADD CONSTRAINT "clinical_session_attendance_clinical_lead_id_fkey" FOREIGN KEY ("clinical_lead_id") REFERENCES "public"."clinical_leads"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "clinical_case_termination" DROP CONSTRAINT "clinical_case_termination_session_id_fkey";
--> statement-breakpoint
CREATE UNIQUE INDEX "clinical_case_termination_case_id_key" ON "clinical_case_termination" USING btree ("case_id");
--> statement-breakpoint
CREATE INDEX "clinical_case_termination_session_id_case_id_idx" ON "clinical_case_termination" USING btree ("session_id","case_id");
--> statement-breakpoint
ALTER TABLE "clinical_case_termination" ADD CONSTRAINT "clinical_case_termination_session_id_case_id_fkey" FOREIGN KEY ("session_id","case_id") REFERENCES "public"."clinical_session_attendance"("id","case_id") ON DELETE restrict ON UPDATE cascade;
