// @vitest-environment node
// Publishing against the database: what publishVersion stores, what it refuses, and that the
// stored layout is frozen afterwards. The publish dialog is tested through the UI in
// tests/e2e/admin-surveys.spec.ts; these cover the outcomes a screen can't easily reach (a lost
// reply, a stale revision) and read what no page shows (the stored layout, the audit row).
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { db, pool } from "#/db/client";
import { survey, surveyAuditEvent, surveyVersion } from "#/db/schema";
import { publishVersion } from "#/lib/actions/survey";
import type { SurveyStatus } from "#/db/enums";
import type { SurveyScope } from "#/lib/auth/admin-access";
import { requireSurveyScope } from "#/lib/auth/admin-access";
import type { SurveyForm, SurveyItem } from "#/lib/survey/form";
import { PREFILL_HEADER_SLOTS, type Prefill } from "#/lib/survey/layout";
import { PRINT_FORM } from "./fixtures/survey-print-form";

vi.mock("#/lib/auth/admin-access", () => ({ requireSurveyScope: vi.fn() }));
vi.mock("#/lib/auth/require-auth-role", () => ({
  ForbiddenRoleError: class extends Error {},
  NotFoundError: class extends Error {},
}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

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
  vi.mocked(requireSurveyScope).mockResolvedValue(scope);
});

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

describe("publishVersion", () => {
  it.each<Prefill>(["NONE", "SCHOOL", "STUDENT"])(
    "stores the layout with the %s prefill and records who published",
    async (prefill) => {
      const versionId = await createDraft(PRINT_FORM);
      const before = new Date();

      const response = await publishVersion({ versionId, revision: 0, prefill });

      expect(response).toEqual({
        success: true,
        message: "Published v1. The survey is now active.",
        data: { outcome: "published" },
      });
      const row = await stored(versionId);
      expect(row).toMatchObject({
        status: "PUBLISHED",
        prefill,
        layoutEngineVersion: 1,
        publishedBy: scope.userId,
      });
      expect(row.publishedAt?.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(row.layout?.prefill).toBe(prefill);
      expect(row.layout?.pages.map((p) => p.header.map((s) => s.slot))).toEqual(
        Array(3).fill(PREFILL_HEADER_SLOTS[prefill]),
      );
      expect(await publishedEvents(versionId)).toEqual([
        {
          actorUserId: scope.userId,
          after: {
            status: "PUBLISHED",
            prefill,
            layoutEngineVersion: 1,
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

    const response = await publishVersion({ versionId, revision: 0, prefill: "NONE" });

    expect(response.success).toBe(false);
    expect(response.message).toMatch(/^Page 2 doesn't fit on A4/);
    expect(response.data).toEqual({
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

    const response = await publishVersion({ versionId, revision: 0, prefill: "NONE" });

    expect(response).toEqual({
      success: false,
      message: "Page 2 is empty. Add items to it or remove it.",
      data: {
        outcome: "invalid",
        issues: [{ field: "pages.1", message: "Page 2 is empty. Add items to it or remove it." }],
      },
    });
    expect((await stored(versionId)).status).toBe("DRAFT");
  });

  it("refuses a revision the draft has moved past", async () => {
    const versionId = await createDraft(PRINT_FORM);

    const response = await publishVersion({ versionId, revision: 3, prefill: "SCHOOL" });

    expect(response.data).toEqual({ outcome: "stale" });
    expect((await stored(versionId)).status).toBe("DRAFT");
  });

  it("treats a repeat of the same publish as done, and refuses a different one", async () => {
    const versionId = await createDraft(PRINT_FORM);
    await publishVersion({ versionId, revision: 0, prefill: "SCHOOL" });

    const repeat = await publishVersion({ versionId, revision: 0, prefill: "SCHOOL" });
    const other = await publishVersion({ versionId, revision: 0, prefill: "STUDENT" });

    expect(repeat).toEqual({
      success: true,
      message: "Published v1",
      data: { outcome: "published" },
    });
    expect(other).toEqual({ success: false, message: "v1 is already published" });
    expect(await publishedEvents(versionId)).toHaveLength(1);
    expect((await stored(versionId)).prefill).toBe("SCHOOL");
  });

  it("makes a draft survey active with its first published version, and records it", async () => {
    const versionId = await createDraft(PRINT_FORM);

    await publishVersion({ versionId, revision: 0, prefill: "NONE" });

    expect(await surveyOf(versionId)).toEqual({
      status: "ACTIVE",
      activations: [{ actorUserId: scope.userId, after: { status: "ACTIVE", versionNumber: 1 } }],
    });
  });

  it.each<SurveyStatus>(["ACTIVE", "CLOSED"])(
    "leaves an %s survey's status as it is",
    async (surveyStatus) => {
      const versionId = await createDraft(PRINT_FORM, surveyStatus);

      const response = await publishVersion({ versionId, revision: 0, prefill: "NONE" });

      expect(response.message).toBe("Published v1");
      expect(await surveyOf(versionId)).toEqual({ status: surveyStatus, activations: [] });
    },
  );

  it("freezes the stored layout once published", async () => {
    const versionId = await createDraft(PRINT_FORM);
    await publishVersion({ versionId, revision: 0, prefill: "NONE" });
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
    await publishVersion({ versionId: published, revision: 0, prefill: "NONE" });
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
