// @vitest-environment node
// Progress and the CSV export, over copies brought to each stage the way scans bring them: printed
// only, one page of three scanned, scanned with unsure answers, and scanned clean. The audit event
// an export leaves shows on no page, so it is read from the database.
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client";
import { hub, project, surveyAuditEvent, surveyQuestionnaire } from "#/db/schema";
import type { SurveyViewer } from "#/lib/auth/survey-access";
import type { FieldRead } from "#/lib/survey/scan-wire";
import { csvOf, exportSurvey } from "#/lib/survey/survey-export";
import { fetchSurveyProgress } from "#/lib/survey/survey-progress";
import {
  createPrintSchool,
  createPublishedSurvey,
  createScannedCopy,
  issueCopy,
  removeSurvey,
} from "#/tests/survey-fixtures";
import { PRINT_FORM } from "./fixtures/survey-print-form";

const ok = (field: string, value: NonNullable<FieldRead["value"]>): FieldRead => ({
  field,
  value,
  status: "ok",
  confidence: 0.99,
});

/** A name as the CSV writes it: quoted when it holds a comma or a quote. */
const csvName = (name: string) => (/[",]/.test(name) ? `"${name.replaceAll('"', '""')}"` : name);

const CLEAN_READS: Record<number, FieldRead[]> = {
  1: [ok("mood", "3"), ok("home", "1"), ok("sport", ["football", "netball"])],
  2: [
    ...["1", "2", "3", "4", "5"].map((row) => ok(`phq.${row}`, "0")),
    ok("age", "14"),
    ok("dob", "2011-02-28"),
  ],
  3: [{ field: "notes", value: null, status: "blank", confidence: null }, ok("sign", true)],
};

const surveyCode = `P${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
let admin: Extract<SurveyViewer, { kind: "project" }>;
let coordinator: Extract<SurveyViewer, { kind: "hub" }>;
let surveyId: string;
let hubName: string;
let schoolName: string;
let otherSchoolName: string;
const copyIds: Record<"printed" | "partial" | "unsure" | "clean" | "otherHub", string> = {
  printed: "",
  partial: "",
  unsure: "",
  clean: "",
  otherHub: "",
};
const removals: (() => Promise<void>)[] = [];

beforeAll(async () => {
  const hubs = await db
    .select({
      hubId: hub.id,
      hubName: hub.hubName,
      implementerId: hub.implementerId,
      projectId: hub.projectId,
    })
    .from(hub)
    .innerJoin(project, eq(project.id, hub.projectId))
    .where(and(eq(project.isDefault, true), isNull(hub.archivedAt)))
    .orderBy(asc(hub.id));
  const [firstHub] = hubs;
  const otherHub = hubs.find(
    (candidate) =>
      candidate.hubId !== firstHub?.hubId &&
      candidate.implementerId === firstHub?.implementerId &&
      candidate.projectId === firstHub?.projectId,
  );
  const member = firstHub
    ? await db.query.implementerMember.findFirst({
        where: (m, { and, eq }) =>
          and(eq(m.implementerId, firstHub.implementerId), eq(m.role, "ADMIN")),
        orderBy: (m, { asc }) => asc(m.id),
      })
    : undefined;
  if (!firstHub || !otherHub || !member) throw new Error("Seed the database first");
  const { implementerId, projectId } = firstHub;
  admin = { kind: "project", implementerId, projectId, userId: member.userId };
  coordinator = {
    kind: "hub",
    implementerId,
    projectId,
    userId: member.userId,
    hubId: firstHub.hubId,
  };
  hubName = firstHub.hubName;

  const school = await createPrintSchool({
    hubId: firstHub.hubId,
    schoolName: `Progress school ${surveyCode}`,
  });
  const otherSchool = await createPrintSchool({
    hubId: otherHub.hubId,
    schoolName: `Progress other school ${surveyCode}`,
  });
  schoolName = school.schoolName;
  otherSchoolName = otherSchool.schoolName;
  removals.push(school.remove, otherSchool.remove);

  const published = await createPublishedSurvey({
    code: surveyCode,
    implementerId,
    projectId,
    createdBy: member.userId,
    form: PRINT_FORM,
  });
  surveyId = published.id;
  const at = { versionId: published.versionId, schoolId: school.schoolId };
  const scope = { ...firstHub, userId: member.userId };

  copyIds.printed = await issueCopy({ scope, ...at });
  const partial = await createScannedCopy({ scope, ...at, pageNumbers: [1] });
  const unsure = await createScannedCopy({ scope, ...at });
  const clean = await createScannedCopy({ scope, ...at, reads: CLEAN_READS });
  copyIds.otherHub = await issueCopy({
    scope: { ...otherHub, userId: member.userId },
    versionId: published.versionId,
    schoolId: otherSchool.schoolId,
  });
  copyIds.partial = partial.questionnaireId;
  copyIds.unsure = unsure.questionnaireId;
  copyIds.clean = clean.questionnaireId;
  // Scans first, then the survey and its copies, then the schools the copies name.
  removals.unshift(partial.remove, unsure.remove, clean.remove, () =>
    removeSurvey({ code: surveyCode }),
  );
});

afterAll(async () => {
  for (const remove of removals) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- in order: scans, survey, schools
    await remove();
  }
});

async function serialOf(copyId: string) {
  const [copy] = await db
    .select({ serial: surveyQuestionnaire.serial })
    .from(surveyQuestionnaire)
    .where(eq(surveyQuestionnaire.id, copyId));
  if (!copy) throw new Error(`No copy ${copyId}`);
  return copy.serial;
}

describe("fetchSurveyProgress", () => {
  it("counts each school's copies by how far they have come back", async () => {
    const progress = await fetchSurveyProgress(admin, surveyId);

    expect(progress.map(({ schoolName, ...counts }) => ({ schoolName, ...counts }))).toEqual([
      expect.objectContaining({
        schoolName,
        issued: 4,
        returned: 3,
        missingPages: 1,
        // The copy missing pages has an unsure answer on the page that came back.
        needsReview: 2,
        ready: 1,
        verified: 0,
      }),
      expect.objectContaining({
        schoolName: otherSchoolName,
        issued: 1,
        returned: 0,
        missingPages: 0,
        needsReview: 0,
        ready: 0,
        verified: 0,
      }),
    ]);
  });

  it("shows a hub coordinator only their hub's schools", async () => {
    const progress = await fetchSurveyProgress(coordinator);

    const ofThisSurvey = progress.filter((row) => row.surveyId === surveyId);
    expect(ofThisSurvey.map((row) => row.schoolName)).toEqual([schoolName]);
  });

  it("shows nothing of a survey outside the viewer's project", async () => {
    const progress = await fetchSurveyProgress(
      { ...admin, projectId: "another-project" },
      surveyId,
    );

    expect(progress).toEqual([]);
  });
});

describe("exportSurvey", () => {
  it("writes one row per copy with each field's option codes, and records the export", async () => {
    const exported = await exportSurvey(admin, surveyId, "answers");
    if (!exported) throw new Error("The survey wasn't exported");
    const lines = exported.csv.split("\r\n");

    expect(exported.fileName).toBe(`${surveyCode}-answers.csv`);
    expect(lines[0]).toBe(
      "serial,hub,school,student_id,version,status,mood,home,sport,phq.1,phq.2,phq.3,phq.4,phq.5,age,dob,notes,sign",
    );
    expect(lines).toContain(
      `${await serialOf(copyIds.clean)},${csvName(hubName)},${csvName(schoolName)},,1,READY,3,1,football;netball,0,0,0,0,0,14,2011-02-28,,1`,
    );
    expect(lines).toContain(
      `${await serialOf(copyIds.printed)},${csvName(hubName)},${csvName(schoolName)},,1,ISSUED,,,,,,,,,,,,`,
    );
    // The unsure mood has no value until someone reviews it; the clean answers on its page do.
    expect(lines).toContain(
      `${await serialOf(copyIds.unsure)},${csvName(hubName)},${csvName(schoolName)},,1,NEEDS_REVIEW,,1,football,0,0,0,0,0,150,2011-02-28,,1`,
    );
    expect(lines).toHaveLength(1 + 5 + 1);

    const [event] = await db
      .select({
        actorUserId: surveyAuditEvent.actorUserId,
        action: surveyAuditEvent.action,
        after: surveyAuditEvent.after,
      })
      .from(surveyAuditEvent)
      .where(eq(surveyAuditEvent.surveyId, surveyId))
      .orderBy(desc(surveyAuditEvent.id))
      .limit(1);
    expect(event).toEqual({
      actorUserId: admin.userId,
      action: "SURVEY_EXPORTED",
      after: { file: "answers", rows: 5 },
    });
  });

  it("writes a codebook row per option of each field", async () => {
    const exported = await exportSurvey(admin, surveyId, "codebook");
    if (!exported) throw new Error("The survey wasn't exported");
    const lines = exported.csv.split("\r\n");

    expect(lines[0]).toBe("version,field,kind,required,prompt,row,code,label");
    expect(lines).toContain(
      '1,phq.1,grid_row,yes,"Over the last two weeks, how often have you been bothered by:",Little interest or pleasure in doing things,3,Nearly every day',
    );
    expect(lines).toContain(
      "1,sport,multiple_choice,no,Which of these do you play?,,none,None of these",
    );
    expect(lines).toContain("1,sign,signature,yes,Signature,,,");
  });

  it("exports nothing of a survey outside the admin's project", async () => {
    expect(
      await exportSurvey({ ...admin, projectId: "another-project" }, surveyId, "answers"),
    ).toBeNull();
  });
});

describe("csvOf", () => {
  it("quotes commas, quotes and line breaks, and keeps a typed formula from running", () => {
    expect(csvOf([["a,b", 'say "hi"', "two\nlines", "=SUM(A1)", "-1", "plain"]])).toBe(
      '"a,b","say ""hi""","two\nlines",\'=SUM(A1),\'-1,plain\r\n',
    );
  });
});
