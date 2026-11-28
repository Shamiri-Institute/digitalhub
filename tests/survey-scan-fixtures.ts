import { createHash } from "node:crypto";

import { asc, eq, inArray } from "drizzle-orm";

import { db } from "#/db/client";
import {
  surveyAnswer,
  surveyPrintFile,
  surveyQuestionnaire,
  surveyQuestionnairePage,
  surveyScanPage,
  surveyUpload,
} from "#/db/schema";
import type { HubSurveyScope } from "#/lib/auth/survey-access";
import { objectId } from "#/lib/crypto";
import { hexChecksum } from "#/lib/s3/utils/checksum";
import { type CheckedPageImage, ingestPages, pageImageRef } from "#/lib/survey/ingest-pages";
import { issuePrintFile, recordPrintRun } from "#/lib/survey/print-run";
import { pageQrText } from "#/lib/survey/print-qr";
import { scanPageImageKey } from "#/lib/survey/scan-files";
import type { PostedPage } from "#/lib/survey/scan-wire";

export async function createMixedOutcomeUpload({
  scope,
  versionId,
  schoolId,
  fileName,
}: {
  scope: HubSurveyScope;
  versionId: string;
  schoolId: string;
  fileName: string;
}) {
  const { questionnaireId, firstPageId } = await db.transaction(async (tx) => {
    const issued = await recordPrintRun(tx, scope, {
      printRunId: objectId("surveyprintrun"),
      versionId,
      request: { kind: "COUNTS", schools: [{ schoolId, copies: 1 }] },
    });
    const [file] = await tx
      .select({ id: surveyPrintFile.id })
      .from(surveyPrintFile)
      .where(eq(surveyPrintFile.printRunId, issued.printRunId));
    if (!file) throw new Error("The print run has no file");
    await issuePrintFile(tx, file.id);
    const [copy] = await tx
      .select({ id: surveyQuestionnaire.id })
      .from(surveyQuestionnaire)
      .where(eq(surveyQuestionnaire.printRunId, issued.printRunId));
    if (!copy) throw new Error("The print run issued no copy");
    const [firstPage] = await tx
      .select({ id: surveyQuestionnairePage.id })
      .from(surveyQuestionnairePage)
      .where(eq(surveyQuestionnairePage.questionnaireId, copy.id))
      .orderBy(asc(surveyQuestionnairePage.pageNumber))
      .limit(1);
    if (!firstPage) throw new Error("The copy has no pages");
    return { questionnaireId: copy.id, firstPageId: firstPage.id };
  });

  const uploadId = objectId("surveyupload");
  const remove = async () => {
    await db.delete(surveyAnswer).where(eq(surveyAnswer.questionnaireId, questionnaireId));
    await db.delete(surveyScanPage).where(eq(surveyScanPage.uploadId, uploadId));
    await db.delete(surveyUpload).where(eq(surveyUpload.id, uploadId));
  };
  await db.insert(surveyUpload).values({
    id: uploadId,
    hubId: scope.hubId,
    uploadedBy: scope.userId,
    s3Key: `scans/${uploadId}`,
    fileName,
    sha256: createHash("sha256").update(uploadId).digest("hex"),
    contentType: "application/pdf",
    byteSize: 1000,
    pageCount: 4,
    status: "PROCESSING",
    uploadedAt: new Date(),
  });
  const imageSha256 = createHash("sha256").update(`page image ${uploadId}`).digest("base64");
  const imageHex = hexChecksum(imageSha256);
  const matchedPageQrs = [pageQrText(firstPageId)];
  const duplicatePageQrs = [pageQrText(firstPageId)];
  const unknownCodePageQrs = [pageQrText(objectId("surveyquestionnairepage"))];
  const noCodePageQrs: string[] = [];
  const posted: PostedPage[] = [
    matchedPageQrs,
    duplicatePageQrs,
    unknownCodePageQrs,
    noCodePageQrs,
  ].map((qrs, pageIndex) => ({
    pageIndex,
    qrs,
    imageSha256,
    rotation: 0,
    aligned: qrs.length > 0,
    quality: 0.95,
    fields: [],
  }));
  const pageImages = new Map<string, CheckedPageImage>(
    posted.map(({ pageIndex }) => [
      pageImageRef(pageIndex, imageHex),
      {
        ok: true,
        key: scanPageImageKey(uploadId, 1, pageIndex, imageHex),
        width: 1654,
        height: 2339,
      },
    ]),
  );
  try {
    const ingested = await db.transaction((tx) =>
      ingestPages(tx, { uploadId, attempt: 1, pageImages }, posted),
    );
    const outcomes =
      ingested.kind === "ingested"
        ? ingested.pages.map((page) => ("status" in page ? page.status : page.result))
        : [ingested.kind];
    if (outcomes.join() !== "MATCHED,DUPLICATE,REJECTED,UNIDENTIFIED") {
      throw new Error(`The scan's pages came back as ${outcomes.join(", ")}`);
    }
    await db.update(surveyUpload).set({ status: "PROCESSED" }).where(eq(surveyUpload.id, uploadId));
  } catch (error) {
    await remove();
    throw error;
  }
  return { remove };
}

/**
 * An upload of `count` pages whose QR codes couldn't be read, ingested as the pipeline posts them,
 * so each is stored UNIDENTIFIED. `remove` deletes the answers placing them wrote, then the scans
 * and upload: run it before the survey of a copy they were placed on is removed, and after any
 * scan kept as their duplicate is.
 */
export async function createUnidentifiedPages({
  scope,
  count = 1,
  fileName,
}: {
  scope: HubSurveyScope;
  count?: number;
  fileName: string;
}) {
  const uploadId = objectId("surveyupload");
  const remove = async () => {
    await db
      .delete(surveyAnswer)
      .where(
        inArray(
          surveyAnswer.scanPageId,
          db
            .select({ id: surveyScanPage.id })
            .from(surveyScanPage)
            .where(eq(surveyScanPage.uploadId, uploadId)),
        ),
      );
    await db.delete(surveyScanPage).where(eq(surveyScanPage.uploadId, uploadId));
    await db.delete(surveyUpload).where(eq(surveyUpload.id, uploadId));
  };
  await db.insert(surveyUpload).values({
    id: uploadId,
    hubId: scope.hubId,
    uploadedBy: scope.userId,
    s3Key: `scans/${uploadId}`,
    fileName,
    sha256: createHash("sha256").update(uploadId).digest("hex"),
    contentType: "application/pdf",
    byteSize: 1000,
    pageCount: count,
    status: "PROCESSING",
    uploadedAt: new Date(),
  });
  const imageSha256 = createHash("sha256").update(`page image ${uploadId}`).digest("base64");
  const imageHex = hexChecksum(imageSha256);
  const posted: PostedPage[] = Array.from({ length: count }, (_, pageIndex) => ({
    pageIndex,
    qrs: [],
    imageSha256,
    rotation: 0,
    aligned: false,
    quality: 0.6,
    fields: [],
  }));
  const pageImages = new Map<string, CheckedPageImage>(
    posted.map(({ pageIndex }) => [
      pageImageRef(pageIndex, imageHex),
      {
        ok: true,
        key: scanPageImageKey(uploadId, 1, pageIndex, imageHex),
        width: 1700,
        height: 2200,
      },
    ]),
  );
  try {
    const ingested = await db.transaction((tx) =>
      ingestPages(tx, { uploadId, attempt: 1, pageImages }, posted),
    );
    const outcomes =
      ingested.kind === "ingested"
        ? ingested.pages.map((page) => ("status" in page ? page.status : page.result))
        : [ingested.kind];
    if (outcomes.some((outcome) => outcome !== "UNIDENTIFIED")) {
      throw new Error(`The scan's pages came back as ${outcomes.join(", ")}`);
    }
    await db.update(surveyUpload).set({ status: "PROCESSED" }).where(eq(surveyUpload.id, uploadId));
  } catch (error) {
    await remove();
    throw error;
  }
  const scans = await db
    .select({ id: surveyScanPage.id })
    .from(surveyScanPage)
    .where(eq(surveyScanPage.uploadId, uploadId))
    .orderBy(asc(surveyScanPage.pageIndex));
  return { uploadId, scanPageIds: scans.map((scan) => scan.id), remove };
}
