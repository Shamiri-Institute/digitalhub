import { createHash } from "node:crypto";

import { asc, eq } from "drizzle-orm";

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

/**
 * A processed upload whose four pages come back with every outcome, ingested as the pipeline posts
 * them: a printed copy's first page (matched), that page again (duplicate), a code nothing printed
 * (rejected, unknown code) and a page with no code (unidentified). No image is uploaded: each page
 * names one, counted as stored. `remove` deletes the answers, scan pages and upload it made.
 */
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
  const posted: PostedPage[] = [
    [pageQrText(firstPageId)],
    [pageQrText(firstPageId)],
    [pageQrText(objectId("surveyquestionnairepage"))],
    [],
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
  const ingested = await db.transaction((tx) =>
    ingestPages(tx, { uploadId, attempt: 1, pageImages }, posted),
  );
  if (ingested.kind !== "ingested") {
    throw new Error(`The scan wasn't ingested: ${ingested.kind}`);
  }
  await db.update(surveyUpload).set({ status: "PROCESSED" }).where(eq(surveyUpload.id, uploadId));

  return {
    async remove() {
      await db.delete(surveyAnswer).where(eq(surveyAnswer.questionnaireId, questionnaireId));
      await db.delete(surveyScanPage).where(eq(surveyScanPage.uploadId, uploadId));
      await db.delete(surveyUpload).where(eq(surveyUpload.id, uploadId));
    },
  };
}
