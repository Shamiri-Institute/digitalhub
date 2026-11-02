// @vitest-environment node
// Publishing against the database: what publishDraftVersion stores, what it refuses, and that the
// stored layout is frozen afterwards. The publish dialog is tested through the UI in
// tests/e2e/admin-surveys.spec.ts; these cover the outcomes a screen can't easily reach (a lost
// reply, a stale revision) and read what no page shows (the stored layout, the audit row).
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db, pool } from "#/db/client";
import { survey, surveyAuditEvent, surveyVersion } from "#/db/schema";
import type { SurveyStatus } from "#/db/enums";
import type { SurveyScope } from "#/lib/auth/admin-access";
import type { SurveyForm, SurveyItem } from "#/lib/survey/form";
import { LAYOUT_ENGINE_VERSION, type Prefill } from "#/lib/survey/layout";
import { publishDraftVersion, type PublishRequest } from "#/lib/survey/publish-version";
import { PRINT_FORM } from "./fixtures/survey-print-form";

let scope: SurveyScope;
const createdCodes: string[] = [];

beforeAll(async () => {
  const member = await db.query.implementerMember.findFirst({
    where: (m, { eq }) => eq(m.role, "ADMIN"),
    orderBy: (m, { asc }) => asc(m.id),
  });
  const project = await db.query.project.findFirst({ where: (p, { eq }) => eq(p.isDefault, true) });
  if (!member || !project) throw new Error("The seed has no admin or default project");
  scope = { userId: member.userId, implementerId: member.implementerId, projectId: project.id };
});

const publish = (request: PublishRequest) => publishDraftVersion(scope, request);

/** The header fields each prefill prints on every page. */
const HEADER_SLOTS: Record<Prefill, string[]> = {
  NONE: ["serial"],
  SCHOOL: ["serial", "school"],
  STUDENT: ["serial", "studentName", "studentId"],
};

// The surveys made here go with their versions; their audit events stay, as history does.
afterAll(async () => {
  if (createdCodes.length > 0) {
    await db.delete(survey).where(inArray(survey.code, createdCodes));
  }
  await pool.end();
});

/** A survey in the caller's scope whose v1 is a draft with this form. */
async function createDraft(form: SurveyForm, surveyStatus: SurveyStatus = "DRAFT") {
  const code = `P${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  createdCodes.push(code);
  const [created] = await db
    .insert(survey)
    .values({
      implementerId: scope.implementerId,
      projectId: scope.projectId,
      code,
      title: `Publish test ${code}`,
      status: surveyStatus,
      createdBy: scope.userId,
    })
    .returning({ id: survey.id });
  if (!created) throw new Error("No survey");
  const [version] = await db
    .insert(surveyVersion)
    .values({ surveyId: created.id, versionNumber: 1, createdBy: scope.userId, form })
    .returning({ id: surveyVersion.id });
  if (!version) throw new Error("No version");
  return version.id;
}

async function stored(versionId: string) {
  const row = await db.query.surveyVersion.findFirst({ where: (v, { eq }) => eq(v.id, versionId) });
  if (!row) throw new Error("No version");
  return row;
}

async function surveyOf(versionId: string) {
  const { surveyId } = await stored(versionId);
  const row = await db.query.survey.findFirst({ where: (s, { eq }) => eq(s.id, surveyId) });
  if (!row) throw new Error("No survey");
  const activations = await db
    .select({ after: surveyAuditEvent.after, actorUserId: surveyAuditEvent.actorUserId })
    .from(surveyAuditEvent)
    .where(
      and(eq(surveyAuditEvent.entityId, surveyId), eq(surveyAuditEvent.action, "SURVEY_ACTIVATED")),
    );
  return { status: row.status, activations };
}

async function publishedEvents(versionId: string) {
  return db
    .select({ after: surveyAuditEvent.after, actorUserId: surveyAuditEvent.actorUserId })
    .from(surveyAuditEvent)
    .where(
      and(
        eq(surveyAuditEvent.entityId, versionId),
        eq(surveyAuditEvent.action, "VERSION_PUBLISHED"),
      ),
    );
}

/** The database's message for a write it refused. */
async function refusal(write: Promise<unknown>) {
  try {
    await write;
  } catch (error) {
    return error instanceof Error && error.cause instanceof Error ? error.cause.message : error;
  }
  return null;
}

function textQuestion(i: number): SurveyItem {
  return {
    id: `t${i}`,
    kind: "text",
    key: `t${i}`,
    prompt: `Question ${i}`,
    required: false,
    lines: 20,
  };
}

describe("publishDraftVersion", () => {
  it.each<Prefill>(["NONE", "SCHOOL", "STUDENT"])(
    "stores the layout with the %s prefill and records who published",
    async (prefill) => {
      const versionId = await createDraft(PRINT_FORM);
      const before = new Date();

      expect(await publish({ versionId, revision: 0, prefill })).toEqual({
        result: { outcome: "published" },
        message: "Published v1. The survey is now active.",
      });
      const row = await stored(versionId);
      expect(row).toMatchObject({
        status: "PUBLISHED",
        prefill,
        layoutEngineVersion: LAYOUT_ENGINE_VERSION,
        publishedBy: scope.userId,
      });
      expect(row.publishedAt?.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(row.layout?.prefill).toBe(prefill);
      expect(row.layout?.pages.map((p) => p.header.map((s) => s.slot))).toEqual(
        Array(3).fill(HEADER_SLOTS[prefill]),
      );
      expect(await publishedEvents(versionId)).toEqual([
        {
          actorUserId: scope.userId,
          after: {
            status: "PUBLISHED",
            prefill,
            layoutEngineVersion: LAYOUT_ENGINE_VERSION,
            pageCount: 3,
            questionCount: 8,
          },
        },
      ]);
    },
  );

  it("refuses a page that doesn't fit, naming it, and leaves the draft alone", async () => {
    const versionId = await createDraft({
      format: 1,
      pages: [{ items: [textQuestion(1)] }, { items: [textQuestion(2), textQuestion(3)] }],
    });

    const { result, message } = await publish({ versionId, revision: 0, prefill: "NONE" });

    expect(message).toMatch(/^Page 2 doesn't fit on A4/);
    expect(result).toEqual({
      outcome: "unfit",
      problems: [expect.objectContaining({ kind: "overflow", page: 2, itemIds: ["t3"] })],
    });
    expect(await stored(versionId)).toMatchObject({ status: "DRAFT", prefill: null, layout: null });
    expect(await publishedEvents(versionId)).toEqual([]);
  });

  it("refuses an unfinished form with what to finish", async () => {
    const versionId = await createDraft({
      format: 1,
      pages: [{ items: [textQuestion(1)] }, { items: [] }],
    });

    expect(await publish({ versionId, revision: 0, prefill: "NONE" })).toEqual({
      result: {
        outcome: "invalid",
        issues: [{ field: "pages.1", message: "Page 2 is empty. Add items to it or remove it." }],
      },
      message: "Page 2 is empty. Add items to it or remove it.",
    });
    expect((await stored(versionId)).status).toBe("DRAFT");
  });

  it("refuses a revision the draft has moved past", async () => {
    const versionId = await createDraft(PRINT_FORM);

    const { result } = await publish({ versionId, revision: 3, prefill: "SCHOOL" });

    expect(result).toEqual({ outcome: "stale" });
    expect((await stored(versionId)).status).toBe("DRAFT");
  });

  it("treats a repeat of the same publish as done, and refuses a different one", async () => {
    const versionId = await createDraft(PRINT_FORM);
    await publish({ versionId, revision: 0, prefill: "SCHOOL" });

    expect(await publish({ versionId, revision: 0, prefill: "SCHOOL" })).toEqual({
      result: { outcome: "published" },
      message: "Published v1",
    });
    await expect(publish({ versionId, revision: 0, prefill: "STUDENT" })).rejects.toThrow(
      "v1 is already published",
    );
    expect(await publishedEvents(versionId)).toHaveLength(1);
    expect((await stored(versionId)).prefill).toBe("SCHOOL");
  });

  it("makes a draft survey active with its first published version, and records it", async () => {
    const versionId = await createDraft(PRINT_FORM);

    await publish({ versionId, revision: 0, prefill: "NONE" });

    expect(await surveyOf(versionId)).toEqual({
      status: "ACTIVE",
      activations: [{ actorUserId: scope.userId, after: { status: "ACTIVE", versionNumber: 1 } }],
    });
  });

  it.each<SurveyStatus>(["ACTIVE", "CLOSED"])(
    "leaves an %s survey's status as it is",
    async (surveyStatus) => {
      const versionId = await createDraft(PRINT_FORM, surveyStatus);

      const { message } = await publish({ versionId, revision: 0, prefill: "NONE" });

      expect(message).toBe("Published v1");
      expect(await surveyOf(versionId)).toEqual({ status: surveyStatus, activations: [] });
    },
  );

  it("refuses a draft of another implementer or project, and leaves it a draft", async () => {
    const versionId = await createDraft(PRINT_FORM);
    const otherImplementer = await db.query.implementer.findFirst({
      where: (i, { ne }) => ne(i.id, scope.implementerId),
      columns: { id: true },
      orderBy: (i, { asc }) => asc(i.id),
    });
    const otherProject = await db.query.project.findFirst({
      where: (p, { ne }) => ne(p.id, scope.projectId),
      columns: { id: true },
      orderBy: (p, { asc }) => asc(p.id),
    });
    if (!otherImplementer || !otherProject)
      throw new Error("The seed has one implementer or project");
    const request = { versionId, revision: 0, prefill: "NONE" } as const;

    for (const outsider of [
      { ...scope, implementerId: otherImplementer.id },
      { ...scope, projectId: otherProject.id },
    ]) {
      await expect(publishDraftVersion(outsider, request)).rejects.toThrow("Version not found");
    }
    expect((await stored(versionId)).status).toBe("DRAFT");
    expect(await publishedEvents(versionId)).toEqual([]);
  });

  it("freezes the stored layout once published", async () => {
    const versionId = await createDraft(PRINT_FORM);
    await publish({ versionId, revision: 0, prefill: "NONE" });
    const row = await stored(versionId);
    const layout = row.layout;
    if (!layout) throw new Error("No layout");

    const error = await refusal(
      db
        .update(surveyVersion)
        .set({ layout: { ...layout, pages: layout.pages.slice(1) } })
        .where(eq(surveyVersion.id, versionId)),
    );

    expect(error).toMatch(/cannot change from PUBLISHED to PUBLISHED/);
  });

  it("never lets a draft hold a layout", async () => {
    const versionId = await createDraft(PRINT_FORM);
    const published = await createDraft(PRINT_FORM);
    await publish({ versionId: published, revision: 0, prefill: "NONE" });
    const { layout } = await stored(published);

    const error = await refusal(
      db
        .update(surveyVersion)
        .set({
          prefill: "NONE",
          layout,
          layoutEngineVersion: 1,
          publishedAt: new Date(),
          publishedBy: scope.userId,
        })
        .where(eq(surveyVersion.id, versionId)),
    );

    expect(error).toMatch(/survey_versions_publish_check/);
  });

  it("never lets a draft hold a prefill without a layout", async () => {
    const versionId = await createDraft(PRINT_FORM);

    const error = await refusal(
      db.update(surveyVersion).set({ prefill: "SCHOOL" }).where(eq(surveyVersion.id, versionId)),
    );

    expect(error).toMatch(/survey_versions_publish_check/);
  });
});
