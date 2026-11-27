// @vitest-environment node
// Verifying and reopening a copy, on copies made the way scans make them. The audit events and a
// copy's stored status are read from the database where no page shows them.
import { and, asc, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client";
import { hub, project, surveyAuditEvent, surveyQuestionnaire, surveyScanPage } from "#/db/schema";
import type { SurveyViewer } from "#/lib/auth/survey-access";
import { reviewAnswer } from "#/lib/survey/answer-review";
import { applyCopyCommand, loadCopy } from "#/lib/survey/copy/copy";
import { type CopyCommand, progressOf } from "#/lib/survey/copy/decide";
import { voidCopy } from "#/lib/survey/print-run";
import { objectId } from "#/lib/crypto";
import {
  CLEAN_PRINT_FORM_READS,
  createPrintSchool,
  createPublishedSurvey,
  createScannedCopy,
  removeSurvey,
  rescanCopyPages,
} from "#/tests/survey-fixtures";
import { PRINT_FORM } from "./fixtures/survey-print-form";

let admin: Extract<SurveyViewer, { kind: "project" }> & { hubId: string };
let coordinator: Extract<SurveyViewer, { kind: "hub" }>;
let schoolId: string;
let versionId: string;
let removeSchool: (() => Promise<void>) | undefined;
const surveyCode = `C${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const removals: (() => Promise<void>)[] = [];

beforeAll(async () => {
  const [defaultHub] = await db
    .select({ hubId: hub.id, implementerId: hub.implementerId, projectId: hub.projectId })
    .from(hub)
    .innerJoin(project, eq(project.id, hub.projectId))
    .where(and(eq(project.isDefault, true), isNull(hub.archivedAt)))
    .orderBy(asc(hub.id))
    .limit(1);
  const member = defaultHub
    ? await db.query.implementerMember.findFirst({
        where: (m, { and, eq }) =>
          and(eq(m.implementerId, defaultHub.implementerId), eq(m.role, "ADMIN")),
        orderBy: (m, { asc }) => asc(m.id),
      })
    : undefined;
  // Any user but the admin stands in for the copies' hub coordinator.
  const someoneElse = member
    ? await db.query.user.findFirst({
        where: (u, { ne }) => ne(u.id, member.userId),
        orderBy: (u, { asc }) => asc(u.id),
        columns: { id: true },
      })
    : undefined;
  if (!defaultHub || !member || !someoneElse) throw new Error("Seed the database first");
  admin = { kind: "project", ...defaultHub, userId: member.userId };
  coordinator = { kind: "hub", ...defaultHub, userId: someoneElse.id };
  const printSchool = await createPrintSchool({
    hubId: admin.hubId,
    schoolName: `Copy test school ${surveyCode}`,
  });
  schoolId = printSchool.schoolId;
  removeSchool = printSchool.remove;
  ({ versionId } = await createPublishedSurvey({
    code: surveyCode,
    implementerId: admin.implementerId,
    projectId: admin.projectId,
    createdBy: admin.userId,
    form: PRINT_FORM,
  }));
});

afterAll(async () => {
  for (const remove of removals.toReversed()) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- rescans before the copies they name
    await remove();
  }
  await removeSurvey({ code: surveyCode });
  await removeSchool?.();
});

async function copy(options: Partial<Parameters<typeof createScannedCopy>[0]> = {}) {
  const made = await createScannedCopy({ scope: admin, versionId, schoolId, ...options });
  removals.push(made.remove);
  return made;
}
const cleanCopy = () => copy({ reads: CLEAN_PRINT_FORM_READS });

function apply(viewer: SurveyViewer, copyId: string, command: CopyCommand) {
  return db.transaction((tx) => applyCopyCommand(tx, viewer, copyId, command));
}

// The verify the copy's page sends: the newest history event it shows.
async function shownVerify(copyId: string): Promise<CopyCommand> {
  const view = await loadCopy(admin, copyId);
  return { kind: "verify", seenEventId: view?.history[0]?.id ?? null };
}

async function storedStatus(copyId: string) {
  const [stored] = await db
    .select({ status: surveyQuestionnaire.status })
    .from(surveyQuestionnaire)
    .where(eq(surveyQuestionnaire.id, copyId));
  return stored?.status;
}

async function copyEvents(copyId: string) {
  return db
    .select({
      action: surveyAuditEvent.action,
      before: surveyAuditEvent.before,
      after: surveyAuditEvent.after,
      reason: surveyAuditEvent.reason,
    })
    .from(surveyAuditEvent)
    .where(
      and(eq(surveyAuditEvent.entityType, "QUESTIONNAIRE"), eq(surveyAuditEvent.entityId, copyId)),
    )
    .orderBy(asc(surveyAuditEvent.id));
}

describe("verifying a copy", () => {
  it("verifies a READY copy once, with the change in its history", async () => {
    const { questionnaireId } = await cleanCopy();
    expect(await storedStatus(questionnaireId)).toBe("READY");

    expect(await apply(coordinator, questionnaireId, await shownVerify(questionnaireId))).toEqual({
      kind: "changed",
      from: "READY",
      to: "VERIFIED",
    });
    expect(await apply(admin, questionnaireId, await shownVerify(questionnaireId))).toEqual({
      kind: "unchanged",
      because: "already-verified",
    });

    expect(await storedStatus(questionnaireId)).toBe("VERIFIED");
    const events = await copyEvents(questionnaireId);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      action: "QUESTIONNAIRE_VERIFIED",
      before: { status: "READY" },
      after: { status: "VERIFIED" },
      reason: null,
    });
  });

  it("refuses a copy with answers waiting for review, and says how many", async () => {
    const { questionnaireId } = await copy();
    expect(await apply(admin, questionnaireId, await shownVerify(questionnaireId))).toEqual({
      kind: "refused",
      refusal: { kind: "answers-need-review", count: 3 },
    });
    expect(await storedStatus(questionnaireId)).toBe("NEEDS_REVIEW");
    expect(await copyEvents(questionnaireId)).toEqual([]);
  });

  it("refuses a copy with pages not scanned, and names them", async () => {
    const { questionnaireId } = await copy({ reads: CLEAN_PRINT_FORM_READS, pageNumbers: [1] });
    expect(await apply(admin, questionnaireId, await shownVerify(questionnaireId))).toEqual({
      kind: "refused",
      refusal: { kind: "pages-missing", pageNumbers: [2, 3], printedPages: 3 },
    });
  });

  it("decides on the copy's answers, not a stored status that fell behind them", async () => {
    const { questionnaireId } = await copy();
    await db
      .update(surveyQuestionnaire)
      .set({ status: "READY" })
      .where(eq(surveyQuestionnaire.id, questionnaireId));
    expect(await apply(admin, questionnaireId, await shownVerify(questionnaireId))).toMatchObject({
      kind: "refused",
      refusal: { kind: "answers-need-review", count: 3 },
    });
  });

  it("refuses a verify sent from a page that predates a correction, and writes nothing", async () => {
    const { questionnaireId, answerId } = await cleanCopy();
    const stale = await shownVerify(questionnaireId);
    await reviewAnswer(
      admin,
      answerId("mood"),
      { kind: "correct", value: "2" },
      { reviewedAt: null },
    );

    expect(await apply(admin, questionnaireId, stale)).toEqual({
      kind: "refused",
      refusal: { kind: "changed-since-seen" },
    });
    expect(await storedStatus(questionnaireId)).toBe("READY");
    expect(await copyEvents(questionnaireId)).toEqual([]);

    expect(await apply(admin, questionnaireId, await shownVerify(questionnaireId))).toEqual({
      kind: "changed",
      from: "READY",
      to: "VERIFIED",
    });
  });

  it("finds no copy of another hub for a hub coordinator", async () => {
    const { questionnaireId } = await cleanCopy();
    const otherHubCoordinator = { ...coordinator, hubId: objectId("hub") };
    expect(
      await apply(otherHubCoordinator, questionnaireId, await shownVerify(questionnaireId)),
    ).toEqual({
      kind: "not-found",
    });
    expect(await loadCopy(otherHubCoordinator, questionnaireId)).toBeNull();
    expect(await storedStatus(questionnaireId)).toBe("READY");
  });

  it("refuses a void copy", async () => {
    const { questionnaireId } = await cleanCopy();
    await db.transaction((tx) => voidCopy(tx, admin, { questionnaireId, reason: "Torn" }));
    expect(await apply(admin, questionnaireId, await shownVerify(questionnaireId))).toEqual({
      kind: "refused",
      refusal: { kind: "void" },
    });
  });

  it("locks the answers, and keeps a later scan aside where the copy shows it", async () => {
    const scanned = await cleanCopy();
    await apply(admin, scanned.questionnaireId, await shownVerify(scanned.questionnaireId));

    await expect(
      reviewAnswer(admin, scanned.answerId("age"), { kind: "accept" }, { reviewedAt: null }),
    ).rejects.toThrow("This copy is verified, so its answers can't change");

    const rescan = await rescanCopyPages({
      scope: admin,
      questionnaireId: scanned.questionnaireId,
      pageNumbers: [2],
      fileName: "late batch.pdf",
    });
    removals.push(rescan.remove);
    const view = await loadCopy(admin, scanned.questionnaireId);
    expect(view?.rejectedScans).toMatchObject([
      { pageNumber: 2, fileName: "late batch.pdf", image: { aligned: true } },
    ]);
    const [rejected] = await db
      .select({ status: surveyScanPage.status, rejectedReason: surveyScanPage.rejectedReason })
      .from(surveyScanPage)
      .where(eq(surveyScanPage.id, view?.rejectedScans[0]?.id ?? ""));
    expect(rejected).toEqual({ status: "REJECTED", rejectedReason: "VERIFIED_COPY" });
    // The page still shows the scan it was verified with.
    expect(view?.pages.map((page) => page.scan !== null)).toEqual([true, true, true]);
  });
});

describe("reopening a copy", () => {
  it("is for the Research team only", async () => {
    const { questionnaireId } = await cleanCopy();
    await apply(admin, questionnaireId, await shownVerify(questionnaireId));
    expect(await apply(coordinator, questionnaireId, { kind: "reopen", reason: "Mine" })).toEqual({
      kind: "refused",
      refusal: { kind: "research-only" },
    });
    expect(await storedStatus(questionnaireId)).toBe("VERIFIED");
  });

  it("returns the copy to what its pages and answers say, with the reason in its history", async () => {
    const { questionnaireId } = await cleanCopy();
    await apply(admin, questionnaireId, await shownVerify(questionnaireId));

    expect(
      await apply(admin, questionnaireId, { kind: "reopen", reason: "Age looks wrong on paper" }),
    ).toEqual({ kind: "changed", from: "VERIFIED", to: "READY" });
    expect(await apply(admin, questionnaireId, { kind: "reopen", reason: "Again" })).toEqual({
      kind: "unchanged",
      because: "not-verified",
    });

    expect(await storedStatus(questionnaireId)).toBe("READY");
    expect(
      (await copyEvents(questionnaireId)).map(({ action, reason }) => [action, reason]),
    ).toEqual([
      ["QUESTIONNAIRE_VERIFIED", null],
      ["QUESTIONNAIRE_REOPENED", "Age looks wrong on paper"],
    ]);
  });
});

describe("what a copy's page shows", () => {
  it("lists its history newest first, naming the question each review was of", async () => {
    const flagged = await copy();
    for (const field of ["mood", "age", "notes"]) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- one review at a time, as a person makes them
      await reviewAnswer(
        admin,
        flagged.answerId(field),
        field === "mood" ? { kind: "correct", value: "2" } : { kind: "correct", value: null },
        { reviewedAt: null },
      );
    }
    await apply(admin, flagged.questionnaireId, await shownVerify(flagged.questionnaireId));
    await apply(admin, flagged.questionnaireId, { kind: "reopen", reason: "Second look" });

    const view = await loadCopy(admin, flagged.questionnaireId);
    expect(
      view?.history.map(({ action, reason, answerLabel }) => [action, reason, answerLabel]),
    ).toEqual([
      ["QUESTIONNAIRE_REOPENED", "Second look", null],
      ["QUESTIONNAIRE_VERIFIED", null, null],
      // Notes went unread, so a blank keeps the value it has and counts as accepting it.
      ["ANSWER_VERIFIED", null, "Is there anything else you would like to tell us?"],
      ["ANSWER_CORRECTED", null, "How old are you?"],
      ["ANSWER_CORRECTED", null, "How are you feeling today?"],
    ]);
    expect(view?.status).toBe("READY");
    expect(view?.pages[0]?.answers[0]).toMatchObject({
      field: "mood",
      valueText: "2",
      reviewStatus: "CORRECTED",
    });
  });

  it("derives each open copy's status as its stored status from the same facts", async () => {
    const copies = await Promise.all([
      copy({ reads: CLEAN_PRINT_FORM_READS, pageNumbers: [1, 3] }),
      copy(),
      cleanCopy(),
    ]);
    const views = await Promise.all(copies.map((made) => loadCopy(admin, made.questionnaireId)));
    expect(views.map((view) => view && [view.status, progressOf(view.facts)])).toEqual([
      ["PARTIAL", "PARTIAL"],
      ["NEEDS_REVIEW", "NEEDS_REVIEW"],
      ["READY", "READY"],
    ]);
    expect(views[0]?.actions.verify).toEqual({
      kind: "refused",
      refusal: { kind: "pages-missing", pageNumbers: [2], printedPages: 3 },
    });
  });
});
