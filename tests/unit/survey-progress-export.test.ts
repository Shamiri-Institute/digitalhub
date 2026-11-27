// @vitest-environment node
// Progress and the CSV export, over copies brought to each stage the way scans bring them: printed
// only, one page of three scanned, scanned with unsure answers, and scanned clean. The audit event
// an export leaves shows on no page, so it is read from the database.
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client";
import { hub, project, surveyAuditEvent, surveyQuestionnaire } from "#/db/schema";
import type { SurveyViewer } from "#/lib/auth/survey-access";
import { fieldQuestionOf } from "#/lib/survey/answer-fields";
import type { SurveyExportOptions } from "#/lib/survey/export-options";
import type { SurveyForm } from "#/lib/survey/form";
import type { FieldRead } from "#/lib/survey/scan-wire";
import { answerCell, csvOf, exportSurvey } from "#/lib/survey/survey-export";
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

/** v1 without "Who do you live with?" and with a question of its own after "Which do you play?". */
const PRINT_FORM_V2: SurveyForm = {
  ...PRINT_FORM,
  pages: PRINT_FORM.pages.map((page, index) =>
    index === 0
      ? {
          ...page,
          items: [
            ...page.items.filter((item) => item.id !== "q_home" && item.kind !== "divider"),
            {
              id: "q_club",
              kind: "single_choice",
              key: "club",
              prompt: "Are you in a school club?",
              required: true,
              options: [
                { code: "1", label: "Yes" },
                { code: "2", label: "No" },
              ],
            },
          ],
        }
      : page,
  ),
};

const CLEAN_READS_V2: Record<number, FieldRead[]> = {
  ...CLEAN_READS,
  1: [ok("mood", "3"), ok("sport", ["football", "netball"]), ok("club", "2")],
};

const BOTH_VERSIONS: SurveyExportOptions = { versions: [1, 2], values: "codes", copies: "all" };
const V1: SurveyExportOptions = { versions: [1], values: "codes", copies: "all" };

const surveyCode = `P${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
let admin: Extract<SurveyViewer, { kind: "project" }>;
let coordinator: Extract<SurveyViewer, { kind: "hub" }>;
let surveyId: string;
let hubName: string;
let schoolName: string;
let otherSchoolName: string;
const copyIds: Record<"printed" | "partial" | "unsure" | "clean" | "otherHub" | "cleanV2", string> =
  {
    printed: "",
    partial: "",
    unsure: "",
    clean: "",
    otherHub: "",
    cleanV2: "",
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
    forms: [PRINT_FORM, PRINT_FORM_V2],
  });
  const [, v2VersionId] = published.versionIds;
  if (!v2VersionId) throw new Error("v2 wasn't published");
  surveyId = published.id;
  const at = { versionId: published.versionId, schoolId: school.schoolId };
  const scope = { ...firstHub, userId: member.userId };

  copyIds.printed = await issueCopy({ scope, ...at });
  const partial = await createScannedCopy({ scope, ...at, pageNumbers: [1] });
  const unsure = await createScannedCopy({ scope, ...at });
  const clean = await createScannedCopy({ scope, ...at, reads: CLEAN_READS });
  const cleanV2 = await createScannedCopy({
    scope,
    versionId: v2VersionId,
    schoolId: school.schoolId,
    reads: CLEAN_READS_V2,
  });
  copyIds.otherHub = await issueCopy({
    scope: { ...otherHub, userId: member.userId },
    versionId: published.versionId,
    schoolId: otherSchool.schoolId,
  });
  copyIds.partial = partial.questionnaireId;
  copyIds.unsure = unsure.questionnaireId;
  copyIds.clean = clean.questionnaireId;
  copyIds.cleanV2 = cleanV2.questionnaireId;
  // Scans first, then the survey and its copies, then the schools the copies name.
  removals.unshift(partial.remove, unsure.remove, clean.remove, cleanV2.remove, () =>
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
        issued: 5,
        returned: 4,
        missingPages: 1,
        // The copy missing pages has an unsure answer on the page that came back.
        needsReview: 2,
        ready: 2,
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

async function latestExportEvent() {
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
  return event;
}

async function exportedLines(file: "answers" | "codebook", options: SurveyExportOptions) {
  const exported = await exportSurvey(admin, surveyId, file, options);
  if (!exported) throw new Error("The survey wasn't exported");
  return exported.csv.split("\r\n");
}

describe("exportSurvey", () => {
  it("writes one row per copy of a version with each field's option codes, and records the export", async () => {
    const exported = await exportSurvey(admin, surveyId, "answers", V1);
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
    expect(await latestExportEvent()).toEqual({
      actorUserId: admin.userId,
      action: "SURVEY_EXPORTED",
      after: { file: "answers", rows: 5, ...V1 },
    });
  });

  it("marks a question a copy's version didn't print as not asked, across versions", async () => {
    const lines = await exportedLines("answers", BOTH_VERSIONS);

    // The newest version's fields in its order, then the field only v1 asked.
    expect(lines[0]).toBe(
      "serial,hub,school,student_id,version,status,mood,sport,club,phq.1,phq.2,phq.3,phq.4,phq.5,age,dob,notes,sign,home",
    );
    expect(lines).toContain(
      `${await serialOf(copyIds.clean)},${csvName(hubName)},${csvName(schoolName)},,1,READY,3,football;netball,NOT_ASKED,0,0,0,0,0,14,2011-02-28,,1,1`,
    );
    expect(lines).toContain(
      `${await serialOf(copyIds.cleanV2)},${csvName(hubName)},${csvName(schoolName)},,2,READY,3,football;netball,2,0,0,0,0,0,14,2011-02-28,,1,NOT_ASKED`,
    );
    expect(lines).toHaveLength(1 + 6 + 1);
  });

  it("writes option labels for text, and only the copies scanned", async () => {
    const lines = await exportedLines("answers", { ...V1, values: "text", copies: "returned" });

    expect(lines).toContain(
      `${await serialOf(copyIds.clean)},${csvName(hubName)},${csvName(schoolName)},,1,READY,3,Both parents,Football;Netball,Not at all,Not at all,Not at all,Not at all,Not at all,14,2011-02-28,,Signed`,
    );
    // The partial, unsure and clean copies; not the copies only printed.
    expect(lines).toHaveLength(1 + 3 + 1);
  });

  it("exports no copy before one is verified", async () => {
    expect(await exportedLines("answers", { ...BOTH_VERSIONS, copies: "verified" })).toHaveLength(
      1 + 1,
    );
  });

  it("writes a codebook row per option of each field of the chosen versions", async () => {
    const lines = await exportedLines("codebook", { ...V1, versions: [2] });

    expect(lines[0]).toBe("version,field,kind,required,prompt,row,code,label");
    expect(lines).toContain(
      '2,phq.1,grid_row,yes,"Over the last two weeks, how often have you been bothered by:",Little interest or pleasure in doing things,3,Nearly every day',
    );
    expect(lines).toContain("2,club,single_choice,yes,Are you in a school club?,,2,No");
    expect(lines).toContain("2,sign,signature,yes,Signature,,,");
    expect(lines.filter((line) => line.startsWith("1,"))).toEqual([]);
  });

  it("exports nothing of a version that wasn't published, or a survey outside the admin's project", async () => {
    expect(await exportSurvey(admin, surveyId, "answers", { ...V1, versions: [3] })).toBeNull();
    expect(
      await exportSurvey({ ...admin, projectId: "another-project" }, surveyId, "answers", V1),
    ).toBeNull();
  });
});

describe("answerCell", () => {
  it("writes each code with its label for both", () => {
    expect(answerCell(fieldQuestionOf(PRINT_FORM, "sport"), ["football", "netball"], "both")).toBe(
      "football: Football;netball: Netball",
    );
  });
});

describe("csvOf", () => {
  it("quotes commas, quotes and line breaks, and keeps a typed formula from running", () => {
    expect(csvOf([["a,b", 'say "hi"', "two\nlines", "=SUM(A1)", "-1", "plain"]])).toBe(
      '"a,b","say ""hi""","two\nlines",\'=SUM(A1),\'-1,plain\r\n',
    );
  });
});
