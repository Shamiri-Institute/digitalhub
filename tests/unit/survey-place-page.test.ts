// @vitest-environment node
// Placing a scan whose QR couldn't be read on the printed page whose code is typed, and the lists
// of pages that need a person. Scan rows and answers are read from the database where no page
// shows them.
import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client";
import {
  hub,
  project,
  surveyAnswer,
  surveyQuestionnaire,
  surveyQuestionnairePage,
  surveyScanPage,
  surveyUpload,
} from "#/db/schema";
import type { HubSurveyScope, SurveyViewer } from "#/lib/auth/survey-access";
import { reviewAnswer } from "#/lib/survey/answer-review";
import { applyCopyCommand, loadCopy } from "#/lib/survey/copy/copy";
import { rerunScanUpload } from "#/lib/survey/pipeline-jobs";
import { voidCopy } from "#/lib/survey/print-run";
import { fetchMissingPages } from "#/lib/survey/scan-pages/missing";
import { normalisePageCode, placeScanPage } from "#/lib/survey/scan-pages/place";
import {
  fetchUnidentifiedPages,
  type UnidentifiedPagesFilters,
} from "#/lib/survey/scan-pages/unidentified";
import {
  CLEAN_PRINT_FORM_READS,
  createPrintSchool,
  createPublishedSurvey,
  createScannedCopy,
  issueCopy,
  removeSurvey,
} from "#/tests/survey-fixtures";
import { createUnidentifiedPages } from "#/tests/survey-scan-fixtures";
import { PRINT_FORM } from "./fixtures/survey-print-form";

let admin: Extract<SurveyViewer, { kind: "project" }> & { hubId: string };
let coordinator: Extract<SurveyViewer, { kind: "hub" }>;
let otherHubScope: HubSurveyScope;
let otherHubCoordinator: Extract<SurveyViewer, { kind: "hub" }>;
let surveyId: string;
let versionId: string;
let schoolId: string;
let otherHubSchoolId: string;
let outsiderPageCode: string;
const surveyCode = `P${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const outsiderSurveyCode = `Q${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
// Unidentified uploads go first: a page placed on a copy holds the copy's printed page.
const pageRemovals: (() => Promise<void>)[] = [];
const copyRemovals: (() => Promise<void>)[] = [];
const schoolRemovals: (() => Promise<void>)[] = [];

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
  // Any user but the admin stands in for the hub coordinators.
  const someoneElse = member
    ? await db.query.user.findFirst({
        where: (u, { ne }) => ne(u.id, member.userId),
        orderBy: (u, { asc }) => asc(u.id),
        columns: { id: true },
      })
    : undefined;
  const [otherHub] = defaultHub
    ? await db
        .select({ id: hub.id })
        .from(hub)
        .where(
          and(
            ne(hub.id, defaultHub.hubId),
            eq(hub.implementerId, defaultHub.implementerId),
            eq(hub.projectId, defaultHub.projectId),
            isNull(hub.archivedAt),
          ),
        )
        .orderBy(asc(hub.id))
        .limit(1)
    : [];
  const [outsiderHub] = defaultHub
    ? await db
        .select({ hubId: hub.id, implementerId: hub.implementerId, projectId: hub.projectId })
        .from(hub)
        .where(and(ne(hub.implementerId, defaultHub.implementerId), isNull(hub.archivedAt)))
        .orderBy(asc(hub.id))
        .limit(1)
    : [];
  if (!defaultHub || !member || !someoneElse || !otherHub || !outsiderHub) {
    throw new Error("Seed the database first");
  }
  admin = { kind: "project", ...defaultHub, userId: member.userId };
  coordinator = { kind: "hub", ...defaultHub, userId: someoneElse.id };
  otherHubScope = { ...defaultHub, hubId: otherHub.id, userId: someoneElse.id };
  otherHubCoordinator = { kind: "hub", ...otherHubScope };

  const [school, otherHubSchool, outsiderSchool] = await Promise.all([
    createPrintSchool({ hubId: admin.hubId, schoolName: `Place test school ${surveyCode}` }),
    createPrintSchool({ hubId: otherHub.id, schoolName: `Place other hub ${surveyCode}` }),
    createPrintSchool({ hubId: outsiderHub.hubId, schoolName: `Place outsider ${surveyCode}` }),
  ]);
  schoolRemovals.push(school.remove, otherHubSchool.remove, outsiderSchool.remove);
  schoolId = school.schoolId;
  otherHubSchoolId = otherHubSchool.schoolId;
  ({ id: surveyId, versionId } = await createPublishedSurvey({
    code: surveyCode,
    implementerId: admin.implementerId,
    projectId: admin.projectId,
    createdBy: admin.userId,
    form: PRINT_FORM,
  }));

  const outsiderSurvey = await createPublishedSurvey({
    code: outsiderSurveyCode,
    implementerId: outsiderHub.implementerId,
    projectId: outsiderHub.projectId,
    createdBy: admin.userId,
    form: PRINT_FORM,
  });
  const outsiderCopyId = await issueCopy({
    scope: { ...outsiderHub, userId: admin.userId },
    versionId: outsiderSurvey.versionId,
    schoolId: outsiderSchool.schoolId,
  });
  outsiderPageCode = await pageCode(outsiderCopyId, 2);
});

afterAll(async () => {
  /* oxlint-disable eslint/no-await-in-loop -- placed pages before their copies, copies before surveys */
  for (const remove of pageRemovals.toReversed()) await remove();
  for (const remove of copyRemovals.toReversed()) await remove();
  /* oxlint-enable eslint/no-await-in-loop */
  await removeSurvey({ code: surveyCode });
  await removeSurvey({ code: outsiderSurveyCode });
  await Promise.all(schoolRemovals.map((remove) => remove()));
});

async function copy(options: Partial<Parameters<typeof createScannedCopy>[0]> = {}) {
  const made = await createScannedCopy({ scope: admin, versionId, schoolId, ...options });
  copyRemovals.push(made.remove);
  return made;
}

async function unidentifiedUpload(scope: HubSurveyScope, fileName: string, count = 1) {
  const made = await createUnidentifiedPages({ scope, fileName, count });
  pageRemovals.push(made.remove);
  return made;
}

async function unidentifiedPage(scope: HubSurveyScope = admin, fileName = "unread.pdf") {
  const [scanPageId] = (await unidentifiedUpload(scope, fileName)).scanPageIds;
  if (!scanPageId) throw new Error("No unidentified page was stored");
  return scanPageId;
}

function place(viewer: SurveyViewer, scanPageId: string, code: string) {
  return db.transaction((tx) => placeScanPage(tx, viewer, { scanPageId, code }));
}

async function pageCode(copyId: string, pageNumber: number) {
  const [printed] = await db
    .select({ code: surveyQuestionnairePage.code })
    .from(surveyQuestionnairePage)
    .where(
      and(
        eq(surveyQuestionnairePage.questionnaireId, copyId),
        eq(surveyQuestionnairePage.pageNumber, pageNumber),
      ),
    );
  if (!printed) throw new Error(`The copy has no page ${pageNumber}`);
  return printed.code;
}

async function serialOf(copyId: string) {
  const [stored] = await db
    .select({ serial: surveyQuestionnaire.serial })
    .from(surveyQuestionnaire)
    .where(eq(surveyQuestionnaire.id, copyId));
  if (!stored) throw new Error("The copy was not issued");
  return stored.serial;
}

async function storedStatus(copyId: string) {
  const [stored] = await db
    .select({ status: surveyQuestionnaire.status })
    .from(surveyQuestionnaire)
    .where(eq(surveyQuestionnaire.id, copyId));
  return stored?.status;
}

async function storedScan(scanPageId: string) {
  const [scan] = await db
    .select({
      status: surveyScanPage.status,
      questionnairePageId: surveyScanPage.questionnairePageId,
      duplicateOfId: surveyScanPage.duplicateOfId,
    })
    .from(surveyScanPage)
    .where(eq(surveyScanPage.id, scanPageId));
  return scan;
}

async function verify(viewer: SurveyViewer, copyId: string) {
  const view = await loadCopy(viewer, copyId);
  const seenEventId = view?.history[0]?.id ?? null;
  return db.transaction((tx) =>
    applyCopyCommand(tx, viewer, copyId, { kind: "verify", seenEventId }),
  );
}

describe("placing an unidentified page", () => {
  it("places it on the page its code names, with every field the page prints waiting for review", async () => {
    const { questionnaireId } = await copy({ reads: CLEAN_PRINT_FORM_READS, pageNumbers: [1, 2] });
    expect(await storedStatus(questionnaireId)).toBe("PARTIAL");
    const serial = await serialOf(questionnaireId);
    const scanPageId = await unidentifiedPage();

    expect(await place(admin, scanPageId, `${serial}-P3`)).toEqual({
      kind: "placed",
      copyId: questionnaireId,
      serial,
      pageNumber: 3,
    });

    const answers = await db
      .select({
        field: surveyAnswer.field,
        readStatus: surveyAnswer.readStatus,
        reviewStatus: surveyAnswer.reviewStatus,
        source: surveyAnswer.source,
        value: surveyAnswer.value,
        flags: surveyAnswer.flags,
      })
      .from(surveyAnswer)
      .where(eq(surveyAnswer.scanPageId, scanPageId))
      .orderBy(asc(surveyAnswer.field));
    const unread = {
      readStatus: "NO_PREDICTION",
      reviewStatus: "NEEDS_REVIEW",
      source: "PIPELINE",
      value: null,
      flags: expect.arrayContaining(["NO_PREDICTION", "NOT_ALIGNED"]),
    };
    expect(answers).toEqual([
      { field: "notes", ...unread },
      { field: "sign", ...unread },
    ]);
    expect(await storedStatus(questionnaireId)).toBe("NEEDS_REVIEW");

    const view = await loadCopy(admin, questionnaireId);
    expect(view?.pages.map((page) => page.scan !== null)).toEqual([true, true, true]);
    expect(view?.history[0]).toMatchObject({
      action: "QUESTIONNAIRE_PAGE_PLACED",
      actor: { kind: "viewer" },
      placedPage: { pageNumber: 3 },
      after: {
        scanPageId,
        pageIndex: 0,
        pageNumber: 3,
        code: `${serial}-P3`,
        answers: { total: 2, autoAccepted: 0, needsReview: 2, noPrediction: 2, keptReviewed: 0 },
      },
    });
  });

  it("refuses to place a page twice, and leaves the other page unscanned", async () => {
    const { questionnaireId } = await copy({ reads: CLEAN_PRINT_FORM_READS, pageNumbers: [1] });
    const serial = await serialOf(questionnaireId);
    const scanPageId = await unidentifiedPage();
    expect(await place(admin, scanPageId, `${serial}-P2`)).toMatchObject({ kind: "placed" });

    expect(await place(coordinator, scanPageId, `${serial}-P3`)).toEqual({
      kind: "not-waiting",
      because: "already-placed",
    });
    const view = await loadCopy(admin, questionnaireId);
    expect(view?.pages.map((page) => page.scan !== null)).toEqual([true, true, false]);
  });

  it("refuses a code naming a page that already has a scan, and leaves the scan waiting", async () => {
    const { questionnaireId } = await copy({ reads: CLEAN_PRINT_FORM_READS, pageNumbers: [1, 2] });
    const serial = await serialOf(questionnaireId);
    const scanPageId = await unidentifiedPage();

    expect(await place(coordinator, scanPageId, `${serial}-P2`)).toEqual({
      kind: "refused",
      refusal: { kind: "page-already-scanned", serial, pageNumber: 2 },
    });
    expect(await storedScan(scanPageId)).toEqual({
      status: "UNIDENTIFIED",
      questionnairePageId: null,
      duplicateOfId: null,
    });
    const written = await db
      .select({ id: surveyAnswer.id })
      .from(surveyAnswer)
      .where(eq(surveyAnswer.scanPageId, scanPageId));
    expect(written).toEqual([]);
    expect(await storedStatus(questionnaireId)).toBe("PARTIAL");

    expect(await place(coordinator, scanPageId, `${serial}-P3`)).toMatchObject({
      kind: "placed",
      pageNumber: 3,
    });
  });

  it("refuses a verified copy until the Research team reopens it", async () => {
    const { questionnaireId } = await copy({ reads: CLEAN_PRINT_FORM_READS });
    const serial = await serialOf(questionnaireId);
    expect(await verify(admin, questionnaireId)).toMatchObject({ kind: "changed" });
    const scanPageId = await unidentifiedPage();

    expect(await place(admin, scanPageId, `${serial}-P1`)).toEqual({
      kind: "refused",
      refusal: { kind: "verified-copy" },
    });
    expect(await storedScan(scanPageId)).toMatchObject({
      status: "UNIDENTIFIED",
      questionnairePageId: null,
    });

    const view = await loadCopy(admin, questionnaireId);
    const seenEventId = view?.history[0]?.id ?? null;
    await db.transaction((tx) =>
      applyCopyCommand(tx, admin, questionnaireId, {
        kind: "reopen",
        reason: "Late page",
        seenEventId,
      }),
    );
    // A verified copy has every page scanned, so reopened it refuses the page for that instead.
    expect(await place(admin, scanPageId, `${serial}-P1`)).toEqual({
      kind: "refused",
      refusal: { kind: "page-already-scanned", serial, pageNumber: 1 },
    });
  });

  it("refuses a void copy", async () => {
    const { questionnaireId } = await copy({ reads: CLEAN_PRINT_FORM_READS, pageNumbers: [1] });
    const serial = await serialOf(questionnaireId);
    await db.transaction((tx) => voidCopy(tx, admin, { questionnaireId, reason: "Torn" }));
    const scanPageId = await unidentifiedPage();

    expect(await place(admin, scanPageId, `${serial}-P2`)).toEqual({
      kind: "refused",
      refusal: { kind: "void-copy" },
    });
    expect(await storedScan(scanPageId)).toMatchObject({ status: "UNIDENTIFIED" });
  });

  it("tells a hub coordinator nothing about another hub's copy but that it is another hub's", async () => {
    const otherHubCopy = await copy({
      scope: otherHubScope,
      schoolId: otherHubSchoolId,
      reads: CLEAN_PRINT_FORM_READS,
      pageNumbers: [1],
    });
    const serial = await serialOf(otherHubCopy.questionnaireId);
    const scanPageId = await unidentifiedPage(coordinator);

    expect(await place(coordinator, scanPageId, `${serial}-P2`)).toEqual({
      kind: "refused",
      refusal: { kind: "other-hub" },
    });
    // Nor may the Research team place a hub's scan on another hub's copy.
    expect(await place(admin, scanPageId, `${serial}-P2`)).toEqual({
      kind: "refused",
      refusal: { kind: "other-hub" },
    });
    expect(await storedScan(scanPageId)).toMatchObject({ status: "UNIDENTIFIED" });
    expect(await storedStatus(otherHubCopy.questionnaireId)).toBe("PARTIAL");
  });

  it("finds no scan of another hub for a hub coordinator", async () => {
    const { questionnaireId } = await copy({ reads: CLEAN_PRINT_FORM_READS, pageNumbers: [1] });
    const serial = await serialOf(questionnaireId);
    const scanPageId = await unidentifiedPage(otherHubScope);

    expect(await place(coordinator, scanPageId, `${serial}-P2`)).toEqual({ kind: "not-found" });
    expect(await storedScan(scanPageId)).toMatchObject({ status: "UNIDENTIFIED" });
  });

  it("knows no code of a survey outside the viewer's implementer", async () => {
    const scanPageId = await unidentifiedPage();
    expect(await place(admin, scanPageId, outsiderPageCode)).toEqual({
      kind: "refused",
      refusal: { kind: "no-such-code", code: outsiderPageCode },
    });
    expect(await place(admin, scanPageId, "NOPE-000001-P1")).toEqual({
      kind: "refused",
      refusal: { kind: "no-such-code", code: "NOPE-000001-P1" },
    });
  });

  it("reads a code typed in lower case, with spaces and another dash", async () => {
    const { questionnaireId } = await copy({ reads: CLEAN_PRINT_FORM_READS, pageNumbers: [1] });
    const serial = await serialOf(questionnaireId);
    const scanPageId = await unidentifiedPage();
    const typed = ` ${serial.toLowerCase().replace("-", " – ")} p2 `;

    expect(await place(coordinator, scanPageId, typed)).toMatchObject({
      kind: "placed",
      pageNumber: 2,
    });
  });

  it("waits for an upload run again to finish reading before its page is placed", async () => {
    const { questionnaireId } = await copy({ reads: CLEAN_PRINT_FORM_READS, pageNumbers: [1] });
    const serial = await serialOf(questionnaireId);
    const { uploadId, scanPageIds } = await unidentifiedUpload(admin, "failed unread.pdf");
    const failed = await db
      .update(surveyUpload)
      .set({ status: "FAILED", error: "The pipeline stopped" })
      .where(eq(surveyUpload.id, uploadId))
      .returning({ id: surveyUpload.id });
    if (failed.length === 0) throw new Error("The upload wasn't failed");
    const [scanPageId] = scanPageIds;
    if (!scanPageId) throw new Error("No unidentified page was stored");
    const listedBefore = await fetchUnidentifiedPages(admin, { uploadId }, 1);
    expect(listedBefore.pages.map((page) => page.id)).toEqual([scanPageId]);

    await rerunScanUpload(admin, uploadId);
    expect(await place(admin, scanPageId, `${serial}-P2`)).toEqual({
      kind: "not-waiting",
      because: "file-being-read",
    });
    expect(await storedScan(scanPageId)).toMatchObject({ status: "UNIDENTIFIED" });
    expect(await fetchUnidentifiedPages(admin, { uploadId }, 1)).toMatchObject({
      total: 0,
      pages: [],
    });
  });

  it("says a page that a rerun set aside is no longer waiting", async () => {
    const { questionnaireId } = await copy({ reads: CLEAN_PRINT_FORM_READS, pageNumbers: [1] });
    const serial = await serialOf(questionnaireId);
    const scanPageId = await unidentifiedPage();
    // As a rerun stores a page whose QR it reads this time, with a code no copy has.
    const setAside = await db
      .update(surveyScanPage)
      .set({ status: "REJECTED", rejectedReason: "UNKNOWN_CODE" })
      .where(eq(surveyScanPage.id, scanPageId))
      .returning({ id: surveyScanPage.id });
    if (setAside.length === 0) throw new Error("The scan wasn't set aside");

    expect(await place(admin, scanPageId, `${serial}-P2`)).toEqual({
      kind: "not-waiting",
      because: "read-again",
    });
    expect(await storedStatus(questionnaireId)).toBe("PARTIAL");
  });

  it("keeps an answer a person already gave on the page", async () => {
    const flagged = await copy();
    const serial = await serialOf(flagged.questionnaireId);
    await reviewAnswer(
      admin,
      flagged.answerId("notes"),
      { kind: "correct", value: "Nothing" },
      { reviewedAt: null },
    );
    // No flow yet leaves a page's answers without its matched scan; a swap of scans will. Set aside
    // as a scan of a verified copy is, the scan keeps its page and its answers.
    const [answer] = await db
      .select({ scanPageId: surveyAnswer.scanPageId })
      .from(surveyAnswer)
      .where(eq(surveyAnswer.id, flagged.answerId("notes")));
    const setAside = await db
      .update(surveyScanPage)
      .set({ status: "REJECTED", rejectedReason: "VERIFIED_COPY" })
      .where(eq(surveyScanPage.id, answer?.scanPageId ?? ""))
      .returning({ id: surveyScanPage.id });
    if (setAside.length === 0) throw new Error("The page's scan wasn't set aside");
    const scanPageId = await unidentifiedPage();

    expect(await place(admin, scanPageId, `${serial}-P3`)).toMatchObject({ kind: "placed" });
    const [kept] = await db
      .select({ value: surveyAnswer.value, reviewStatus: surveyAnswer.reviewStatus })
      .from(surveyAnswer)
      .where(eq(surveyAnswer.id, flagged.answerId("notes")));
    expect(kept).toEqual({ value: "Nothing", reviewStatus: "CORRECTED" });
    const view = await loadCopy(admin, flagged.questionnaireId);
    expect(view?.history[0]?.after).toMatchObject({
      answers: { total: 0, keptReviewed: 2 },
    });
  });
});

describe("a typed page code", () => {
  it.each([
    ["BASE26-000017-P3", "BASE26-000017-P3"],
    [" BASE26-000017-P3 ", "BASE26-000017-P3"],
    ["BASE26 000017 P3", "BASE26-000017-P3"],
    ["base26–000017-p3", "BASE26-000017-P3"],
    ["BASE26 - 000017 -- P3", "BASE26-000017-P3"],
    ["BASE26\t000017\n-P3", "BASE26-000017-P3"],
    ["BASE26–000017—P3", "BASE26-000017-P3"],
    ["base26−000017‑p3", "BASE26-000017-P3"],
  ])("%j reads as %s", (typed, code) => {
    expect(normalisePageCode(typed)).toBe(code);
  });
});

describe("copies missing pages", () => {
  it("lists a copy with pages left to scan, and the pages, to the viewers who see its hub", async () => {
    const partial = await copy({ reads: CLEAN_PRINT_FORM_READS, pageNumbers: [1, 3] });
    const complete = await copy({ reads: CLEAN_PRINT_FORM_READS });
    const serial = await serialOf(partial.questionnaireId);

    const listed = await fetchMissingPages(admin, { surveyId });
    const ids = listed.copies.map((listedCopy) => listedCopy.id);
    expect(ids).toContain(partial.questionnaireId);
    expect(ids).not.toContain(complete.questionnaireId);
    expect(
      listed.copies.find((listedCopy) => listedCopy.id === partial.questionnaireId),
    ).toMatchObject({
      serial,
      survey: { id: surveyId, code: surveyCode },
      printedPages: 3,
      missingPages: [{ pageNumber: 2, code: `${serial}-P2` }],
      lastScannedAt: expect.any(Date),
    });

    const coordinatorIds = (await fetchMissingPages(coordinator, { surveyId })).copies.map(
      (listedCopy) => listedCopy.id,
    );
    expect(coordinatorIds).toContain(partial.questionnaireId);
    const otherHubIds = (await fetchMissingPages(otherHubCoordinator, { surveyId })).copies.map(
      (listedCopy) => listedCopy.id,
    );
    expect(otherHubIds).not.toContain(partial.questionnaireId);
  });
});

describe("unidentified pages", () => {
  it("lists a hub's unidentified pages to its coordinator and the Research team only", async () => {
    const own = await unidentifiedUpload(admin, "own hub unread.pdf");
    const otherHub = await unidentifiedUpload(otherHubScope, "other hub unread.pdf");
    const listed = async (viewer: SurveyViewer, filters: UnidentifiedPagesFilters) =>
      (await fetchUnidentifiedPages(viewer, filters, 1)).pages.map((page) => page.id);

    expect(await listed(admin, { uploadId: own.uploadId })).toEqual(own.scanPageIds);
    expect(await listed(admin, { uploadId: otherHub.uploadId })).toEqual(otherHub.scanPageIds);
    const coordinatorOwn = await fetchUnidentifiedPages(coordinator, { uploadId: own.uploadId }, 1);
    expect(coordinatorOwn).toMatchObject({
      upload: { id: own.uploadId, fileName: "own hub unread.pdf" },
      total: 1,
      pages: [
        {
          id: own.scanPageIds[0],
          fileName: "own hub unread.pdf",
          pageIndex: 0,
          image: { url: expect.stringContaining("http"), aligned: false },
        },
      ],
    });
    // Another hub's upload is no filter of a coordinator's, and its pages aren't theirs to list.
    const coordinatorOther = await fetchUnidentifiedPages(
      coordinator,
      { uploadId: otherHub.uploadId },
      1,
    );
    expect(coordinatorOther.upload).toBeNull();
    expect(coordinatorOther.pages.map((page) => page.id)).not.toContain(otherHub.scanPageIds[0]);
    expect(
      await listed(admin, { hubId: otherHubScope.hubId, uploadId: otherHub.uploadId }),
    ).toEqual(otherHub.scanPageIds);
    expect(await listed(admin, { hubId: otherHubScope.hubId, uploadId: own.uploadId })).toEqual([]);
  });

  it("lists an upload's pages a page of the list at a time", async () => {
    const long = await unidentifiedUpload(admin, "long unread.pdf", 25);

    const first = await fetchUnidentifiedPages(admin, { uploadId: long.uploadId }, 1);
    expect(first).toMatchObject({ total: 25, page: 1, pageCount: 2 });
    expect(first.pages).toHaveLength(24);
    // A page past the last shows the last.
    const last = await fetchUnidentifiedPages(admin, { uploadId: long.uploadId }, 9);
    expect(last).toMatchObject({ total: 25, page: 2, pageCount: 2 });
    expect([...first.pages, ...last.pages].map((page) => page.id).toSorted()).toEqual(
      long.scanPageIds.toSorted(),
    );
  });
});
