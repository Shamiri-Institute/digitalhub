import "server-only";

import { and, eq } from "drizzle-orm";

import type { Transaction } from "#/db/client";
import {
  type ScanRejectionNamingAPage,
  SurveyAuditActor,
  SurveyScanPageStatus,
  SurveyScanRejection,
} from "#/db/enums";
import {
  survey,
  surveyQuestionnaire,
  surveyQuestionnairePage,
  surveyScanPage,
  surveyUpload,
} from "#/db/schema";
import type { SurveyViewer } from "#/lib/auth/survey-access";
import { recordSurveyEvent, SurveyAuditAction, SurveyAuditEntity } from "#/lib/survey/audit";
import {
  loadIngestContext,
  lockCopies,
  planPageAnswers,
  recomputeCopyStatuses,
  writeAnswers,
} from "#/lib/survey/ingest-pages";
import { rejectionOfPrintedPage } from "#/lib/survey/ingest-rules";
import { uploadHubInScope } from "#/lib/survey/scan-upload-queries";
import { FINISHED_UPLOAD_STATUSES } from "#/lib/survey/scan-upload-status";

export type PlaceCommand = { scanPageId: string; code: string };

export type PlaceResult =
  | { kind: "placed"; copyId: string; serial: string; pageNumber: number }
  // The typed code names a page this scan can't go on. Nothing is stored.
  | { kind: "refused"; refusal: PlaceRefusal }
  // The scan changed since the viewer's list was drawn. Nothing is stored.
  | { kind: "not-waiting"; because: Exclude<ScanPageUnavailable, "waiting"> }
  // The scan is missing or outside the viewer's scope, alike.
  | { kind: "not-found" };

export type PlaceRefusal =
  // Also a code of a survey outside the viewer's implementer and project.
  | { kind: "no-such-code"; code: string }
  // Says nothing about that copy.
  | { kind: "other-hub" }
  | { kind: "void-copy" }
  | { kind: "verified-copy" }
  // Refused rather than kept as a duplicate, which a mistyped code would leave out of sight.
  | { kind: "page-already-scanned"; serial: string; pageNumber: number };

/** Where a scan stands for the people sorting the pages ingest couldn't place. */
export type ScanPageStanding =
  // Unidentified, for a person to place or set aside.
  | "waiting"
  // Set aside by a person as not a survey page.
  | "set-aside"
  // Placed on a copy, by a person or by a rerun of its upload.
  | "already-placed"
  // A rerun of its upload read the page again and rejected it.
  | "read-again";

export type ScanPageUnavailable =
  | ScanPageStanding
  // Its upload is being read, so the page may yet change.
  | "file-being-read";

function standingOf(scan: {
  status: SurveyScanPageStatus;
  rejectedReason: SurveyScanRejection | null;
}): ScanPageStanding {
  switch (scan.status) {
    case SurveyScanPageStatus.UNIDENTIFIED:
      return "waiting";
    case SurveyScanPageStatus.MATCHED:
    case SurveyScanPageStatus.DUPLICATE:
      return "already-placed";
    case SurveyScanPageStatus.REJECTED:
      return scan.rejectedReason === SurveyScanRejection.NOT_A_SURVEY_PAGE
        ? "set-aside"
        : "read-again";
  }
}

/**
 * Locks the scan's upload, scoped by the hub it was uploaded for, then reads the scan. Every
 * change to an unplaced scan takes this lock first, as ingest does. Null when the scan is missing
 * or outside the viewer's scope, alike.
 */
export async function lockScanPage(tx: Transaction, viewer: SurveyViewer, scanPageId: string) {
  const [upload] = await tx
    .select({ id: surveyUpload.id, hubId: surveyUpload.hubId, status: surveyUpload.status })
    .from(surveyScanPage)
    .innerJoin(surveyUpload, eq(surveyUpload.id, surveyScanPage.uploadId))
    .where(and(eq(surveyScanPage.id, scanPageId), uploadHubInScope(viewer, surveyUpload.hubId)))
    .for("update", { of: surveyUpload });
  if (!upload) {
    return null;
  }
  // A separate statement after the lock, so it sees an ingest or a change that just committed.
  const [scan] = await tx
    .select({
      status: surveyScanPage.status,
      rejectedReason: surveyScanPage.rejectedReason,
      pageIndex: surveyScanPage.pageIndex,
      postedResult: surveyScanPage.postedResult,
    })
    .from(surveyScanPage)
    .where(eq(surveyScanPage.id, scanPageId));
  if (!scan) {
    return null;
  }
  return {
    upload,
    scan,
    standing: standingOf(scan),
    uploadFinished: FINISHED_UPLOAD_STATUSES.includes(upload.status),
  };
}
export type LockedScanPage = NonNullable<Awaited<ReturnType<typeof lockScanPage>>>;

const REFUSAL_OF_REJECTION = {
  [SurveyScanRejection.OTHER_HUB]: { kind: "other-hub" },
  [SurveyScanRejection.VOID_COPY]: { kind: "void-copy" },
  [SurveyScanRejection.VERIFIED_COPY]: { kind: "verified-copy" },
} as const satisfies Record<ScanRejectionNamingAPage, PlaceRefusal>;

/**
 * Places a scan whose QR couldn't be read on the printed page whose code was typed, deciding as
 * ingest decides from a QR, except that a page with a scan already is refused rather than kept as
 * a duplicate. A refusal stores nothing. Nothing on the page was read against its layout, so every
 * field it prints waits for review. Locks the upload, then the copy, as ingest does.
 */
export async function placeScanPage(
  tx: Transaction,
  viewer: SurveyViewer,
  command: PlaceCommand,
): Promise<PlaceResult> {
  const locked = await lockScanPage(tx, viewer, command.scanPageId);
  if (!locked) {
    return { kind: "not-found" };
  }
  const { upload, scan } = locked;
  if (locked.standing !== "waiting") {
    return { kind: "not-waiting", because: locked.standing };
  }
  if (!locked.uploadFinished) {
    return { kind: "not-waiting", because: "file-being-read" };
  }
  if ("error" in scan.postedResult) {
    throw new Error(`Unidentified scan ${command.scanPageId} has no read page`);
  }

  const code = normalisePageCode(command.code);
  const [printed] = await tx
    .select({
      id: surveyQuestionnairePage.id,
      questionnaireId: surveyQuestionnairePage.questionnaireId,
      pageNumber: surveyQuestionnairePage.pageNumber,
      serial: surveyQuestionnaire.serial,
    })
    .from(surveyQuestionnairePage)
    .innerJoin(
      surveyQuestionnaire,
      eq(surveyQuestionnaire.id, surveyQuestionnairePage.questionnaireId),
    )
    .innerJoin(survey, eq(survey.id, surveyQuestionnaire.surveyId))
    // Scoped by survey rather than hub, so another hub's page is refused as ingest refuses it.
    .where(
      and(
        eq(surveyQuestionnairePage.code, code),
        eq(survey.implementerId, viewer.implementerId),
        eq(survey.projectId, viewer.projectId),
      ),
    );
  if (!printed) {
    return { kind: "refused", refusal: { kind: "no-such-code", code } };
  }

  const context = await loadIngestContext(tx, {
    namedPages: [printed],
    copiesById: await lockCopies(tx, [printed.questionnaireId]),
    namedPageIds: [printed.id],
  });
  const page = context.printedPagesById.get(printed.id);
  if (!page) {
    throw new Error(`Printed page ${code} was not loaded`);
  }
  const rejection = rejectionOfPrintedPage(page, upload.hubId);
  if (rejection) {
    return { kind: "refused", refusal: REFUSAL_OF_REJECTION[rejection] };
  }

  // The copy is in the viewer's scope: another hub's was refused above.
  if (context.matchedScanByPage.has(page.questionnairePageId)) {
    return {
      kind: "refused",
      refusal: {
        kind: "page-already-scanned",
        serial: printed.serial,
        pageNumber: page.pageNumber,
      },
    };
  }

  const [placed] = await tx
    .update(surveyScanPage)
    .set({ status: SurveyScanPageStatus.MATCHED, questionnairePageId: page.questionnairePageId })
    .where(eq(surveyScanPage.id, command.scanPageId))
    .returning({ id: surveyScanPage.id });
  if (!placed) {
    throw new Error(`Scan page ${command.scanPageId} disappeared while its upload was locked`);
  }

  const planned = planPageAnswers(context, page, { ...scan.postedResult, fields: [] });
  if (!planned.ok) {
    throw new Error(planned.reason);
  }
  const answerCounts = await writeAnswers(tx, [
    { scanPageId: command.scanPageId, copy: page.copy, answers: planned.answers },
  ]);
  await recomputeCopyStatuses(tx, [page.copy.id]);

  await recordSurveyEvent(tx, {
    actor: { kind: SurveyAuditActor.USER, userId: viewer.userId },
    surveyId: page.copy.surveyId,
    entityType: SurveyAuditEntity.QUESTIONNAIRE,
    entityId: page.copy.id,
    action: SurveyAuditAction.QUESTIONNAIRE_PAGE_PLACED,
    after: {
      scanPageId: command.scanPageId,
      uploadId: upload.id,
      pageIndex: scan.pageIndex,
      pageNumber: page.pageNumber,
      code,
      answers: answerCounts.get(command.scanPageId),
    },
  });
  return {
    kind: "placed",
    copyId: page.copy.id,
    serial: printed.serial,
    pageNumber: page.pageNumber,
  };
}

// Spaces, and the dashes a keyboard or a pasted code may give in place of a hyphen.
const SEPARATORS = /[\s\u2010-\u2015\u2212-]+/g;

/**
 * A code typed from paper, in its printed form. A run of spaces and dashes is one separator, so
 * `base26 000017 – p3` is `BASE26-000017-P3`.
 */
export function normalisePageCode(typed: string) {
  return typed.trim().replaceAll(SEPARATORS, "-").toUpperCase();
}

export function placeRefusalMessage(refusal: PlaceRefusal): string {
  switch (refusal.kind) {
    case "no-such-code":
      return `No printed page has the code ${refusal.code}. Check it against the code under the QR.`;
    case "other-hub":
      return "That page belongs to another hub's copy.";
    case "void-copy":
      return "That copy is void, so pages can't be placed on it.";
    case "verified-copy":
      return "That copy is verified. The Research team can reopen it first.";
    case "page-already-scanned":
      return `Page ${refusal.pageNumber} of ${refusal.serial} already has a scan. Check the code.`;
  }
}

// The list refreshes without the page, so these don't ask the viewer to.
export function unavailableMessage(because: ScanPageUnavailable): string {
  switch (because) {
    case "waiting":
      return "This page was put back already.";
    case "set-aside":
      return "This page was set aside as not a survey page.";
    case "already-placed":
      return "This page was placed already.";
    case "read-again":
      return "This page was read again and is no longer waiting to be placed.";
    case "file-being-read":
      return "This page's file is still being read. Try again when it has finished.";
  }
}
