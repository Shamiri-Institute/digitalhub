import "server-only";

import { eq } from "drizzle-orm";

import type { Transaction } from "#/db/client";
import { SurveyAuditActor, SurveyScanPageStatus, SurveyScanRejection } from "#/db/enums";
import { surveyScanPage } from "#/db/schema";
import type { SurveyViewer } from "#/lib/auth/survey-access";
import { recordSurveyEvent, SurveyAuditAction, SurveyAuditEntity } from "#/lib/survey/audit";
import {
  lockScanPage,
  type LockedScanPage,
  type ScanPageStanding,
  type ScanPageUnavailable,
} from "#/lib/survey/scan-pages/place";

export type ScanPageCommand = { scanPageId: string };

export type MoveResult<From extends ScanPageStanding> =
  | { kind: "moved" }
  // The scan changed since the viewer's list was drawn. Nothing is stored.
  | { kind: "unavailable"; because: Exclude<ScanPageUnavailable, From> }
  // The scan is missing or outside the viewer's scope, alike.
  | { kind: "not-found" };

/** Sets aside a page ingest couldn't place that is no survey page: a blank back, a cover sheet. */
export async function setScanPageAside(
  tx: Transaction,
  viewer: SurveyViewer,
  command: ScanPageCommand,
): Promise<MoveResult<"waiting">> {
  const locked = await lockScanPage(tx, viewer, command.scanPageId);
  if (!locked) {
    return { kind: "not-found" };
  }
  if (locked.standing !== "waiting") {
    return { kind: "unavailable", because: locked.standing };
  }
  if (!locked.uploadFinished) {
    return { kind: "unavailable", because: "file-being-read" };
  }
  await moveScanPage(tx, viewer, command.scanPageId, locked, SET_ASIDE);
  return { kind: "moved" };
}

export async function putScanPageBack(
  tx: Transaction,
  viewer: SurveyViewer,
  command: ScanPageCommand,
): Promise<MoveResult<"set-aside">> {
  const locked = await lockScanPage(tx, viewer, command.scanPageId);
  if (!locked) {
    return { kind: "not-found" };
  }
  if (locked.standing !== "set-aside") {
    return { kind: "unavailable", because: locked.standing };
  }
  if (!locked.uploadFinished) {
    return { kind: "unavailable", because: "file-being-read" };
  }
  await moveScanPage(tx, viewer, command.scanPageId, locked, PUT_BACK);
  return { kind: "moved" };
}

const SET_ASIDE = {
  scan: {
    status: SurveyScanPageStatus.REJECTED,
    rejectedReason: SurveyScanRejection.NOT_A_SURVEY_PAGE,
  },
  action: SurveyAuditAction.SCAN_PAGE_SET_ASIDE,
};
const PUT_BACK = {
  scan: { status: SurveyScanPageStatus.UNIDENTIFIED, rejectedReason: null },
  action: SurveyAuditAction.SCAN_PAGE_PUT_BACK,
};

async function moveScanPage(
  tx: Transaction,
  viewer: SurveyViewer,
  scanPageId: string,
  locked: LockedScanPage,
  move: typeof SET_ASIDE | typeof PUT_BACK,
) {
  const [moved] = await tx
    .update(surveyScanPage)
    .set(move.scan)
    .where(eq(surveyScanPage.id, scanPageId))
    .returning({ id: surveyScanPage.id });
  if (!moved) {
    throw new Error(`Scan page ${scanPageId} disappeared while its upload was locked`);
  }
  await recordSurveyEvent(tx, {
    actor: { kind: SurveyAuditActor.USER, userId: viewer.userId },
    // A page that names no printed page belongs to no survey.
    surveyId: undefined,
    entityType: SurveyAuditEntity.SCAN_PAGE,
    entityId: scanPageId,
    action: move.action,
    after: { uploadId: locked.upload.id, pageIndex: locked.scan.pageIndex },
  });
}
