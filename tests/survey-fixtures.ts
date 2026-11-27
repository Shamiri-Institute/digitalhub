import { createHash } from "node:crypto";

import { asc, eq, inArray } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";

import { db } from "#/db/client";
import type { SurveyVersionPrefill } from "#/db/enums";
import {
  school,
  student,
  survey,
  surveyAnswer,
  surveyPrintFile,
  surveyPrintRun,
  surveyQuestionnaire,
  surveyQuestionnairePage,
  surveyScanPage,
  surveyUpload,
  surveyVersion,
} from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { deleteObject } from "#/lib/s3/s3.service";
import { hexChecksum } from "#/lib/s3/utils/checksum";
import { type CheckedPageImage, ingestPages, pageImageRef } from "#/lib/survey/ingest-pages";
import { issuePrintFile, recordPrintRun } from "#/lib/survey/print-run";
import { pageQrText } from "#/lib/survey/print-qr";
import { scanPageImageKey } from "#/lib/survey/scan-files";
import type { FieldRead, PostedPage } from "#/lib/survey/scan-wire";
import { printFileKey } from "#/lib/survey/print-files";
import type { SurveyForm } from "#/lib/survey/form";
import { checkPublish } from "#/lib/survey/publish";
import { storePublished } from "#/lib/survey/store-published";

export const TWO_QUESTIONS: SurveyForm = {
  format: 1,
  pages: [
    {
      items: [
        {
          id: "mood",
          kind: "single_choice",
          key: "mood",
          prompt: "How do you feel today?",
          required: true,
          options: ["1", "2", "3", "4", "5"].map((code) => ({ code, label: code })),
        },
        {
          id: "notes",
          kind: "text",
          key: "notes",
          prompt: "Anything else?",
          required: false,
          lines: 1,
        },
      ],
    },
  ],
};

/** A form of `pageCount` pages with one short question each, which prints one page per form page. */
export function formWithPages(pageCount: number): SurveyForm {
  return {
    format: 1,
    pages: Array.from({ length: pageCount }, (_, index) => ({
      items: [
        {
          id: `q${index + 1}`,
          kind: "text",
          key: `q${index + 1}`,
          prompt: `Question ${index + 1}`,
          required: false,
          lines: 1,
        },
      ],
    })),
  };
}

/**
 * A survey whose v1 (and with `versionCount`, each version after it) is published, written straight
 * to the DB the way the publish action writes it, so the survey is active and every version has its
 * print layout. The caller deletes the survey by its code afterwards, which removes its versions,
 * print runs, copies and pages with it.
 */
export async function createPublishedSurvey({
  code,
  implementerId,
  projectId,
  createdBy,
  prefill = "NONE",
  form = TWO_QUESTIONS,
  versionCount = 1,
  forms = Array.from({ length: versionCount }, () => form),
}: {
  code: string;
  implementerId: string;
  projectId: string;
  createdBy: string;
  prefill?: SurveyVersionPrefill;
  form?: SurveyForm;
  versionCount?: number;
  /** Each version's form, from v1 on, in place of `form` and `versionCount`. */
  forms?: SurveyForm[];
}) {
  const [created] = await db
    .insert(survey)
    .values({
      implementerId,
      projectId,
      code,
      // The code is unique, so the title is too, even across tests running in parallel.
      title: `Published ${code}`,
      createdBy,
    })
    .returning();
  if (!created) throw new Error("The survey was not created");
  const versionIds: string[] = [];
  let pageCount = 0;
  /* oxlint-disable eslint/no-await-in-loop -- each version is published after the one before */
  for (const [index, versionForm] of forms.entries()) {
    const versionNumber = index + 1;
    const publishable = checkPublish(versionForm, [], prefill);
    if (!publishable.ok) throw new Error(`The form can't be published with prefill ${prefill}`);
    pageCount ||= publishable.layout.pages.length;
    const [version] = await db
      .insert(surveyVersion)
      .values({ surveyId: created.id, versionNumber, createdBy, form: versionForm })
      .returning();
    if (!version) throw new Error("The version was not created");
    await db.transaction((tx) =>
      storePublished(tx, {
        version,
        form: publishable.form,
        layout: publishable.layout,
        userId: createdBy,
      }),
    );
    versionIds.push(version.id);
  }
  /* oxlint-enable eslint/no-await-in-loop */
  const [versionId] = versionIds;
  if (!versionId) throw new Error("No version was published");
  return {
    id: created.id,
    code,
    title: created.title,
    versionId,
    versionIds,
    pageCount,
  };
}

/**
 * A school of `hubId` with the named students, for a test to print at, so no other test's run uses
 * it. Copies keep their school and students from being deleted, so `remove` runs after the
 * survey that printed there is deleted.
 */
export async function createPrintSchool({
  hubId,
  schoolName,
  studentNames = [],
}: {
  hubId: string;
  schoolName: string;
  studentNames?: string[];
}) {
  const schoolId = objectId("school");
  await db.insert(school).values({ id: schoolId, schoolName, visibleId: schoolId, hubId });
  const studentRows = studentNames.map((studentName) => {
    const id = objectId("student");
    return { id, studentName, visibleId: id, schoolId };
  });
  if (studentRows.length > 0) {
    await db.insert(student).values(studentRows);
  }
  const remove = async () => {
    await db.delete(student).where(eq(student.schoolId, schoolId));
    await db.delete(school).where(eq(school.id, schoolId));
  };
  return { schoolId, schoolName, remove };
}

/**
 * Deletes a survey made for a test, with its versions, runs, copies and pages, and its print
 * files' PDFs from S3, which the database can't delete with it.
 */
export async function removeSurvey(match: { code: string } | { id: string }) {
  const surveyMatch = "code" in match ? eq(survey.code, match.code) : eq(survey.id, match.id);
  const files = await db
    .select({ id: surveyPrintFile.id, printRunId: surveyPrintFile.printRunId })
    .from(surveyPrintFile)
    .innerJoin(surveyPrintRun, eq(surveyPrintRun.id, surveyPrintFile.printRunId))
    .innerJoin(surveyVersion, eq(surveyVersion.id, surveyPrintRun.versionId))
    .innerJoin(survey, eq(survey.id, surveyVersion.surveyId))
    .where(surveyMatch);
  await db.transaction(async (tx) => {
    // Locks the files before the survey, in the order the print job takes them, so a job still
    // issuing one of these files is waited for instead of deadlocking with the delete.
    if (files.length > 0) {
      await tx
        .select({ id: surveyPrintFile.id })
        .from(surveyPrintFile)
        .where(
          inArray(
            surveyPrintFile.id,
            files.map((file) => file.id),
          ),
        )
        .for("update");
    }
    await tx.delete(survey).where(surveyMatch);
  });
  await Promise.all(
    files.map((file) => deleteObject({ Key: printFileKey(file) }, "survey-print-files")),
  );
}

export async function removeScanUploads(sha256s: string[]) {
  if (sha256s.length === 0) {
    return;
  }
  const removed = await db
    .delete(surveyUpload)
    .where(inArray(surveyUpload.sha256, sha256s))
    .returning({ s3Key: surveyUpload.s3Key });
  await Promise.all(removed.map(({ s3Key }) => deleteObject({ Key: s3Key }, "survey-scans")));
}

/** A one-page PDF no other test has made, so its hash is unique, with that hash in hex. */
export async function uniqueScanPdf(label: string) {
  const pdf = await PDFDocument.create();
  pdf.addPage([595, 842]).drawText(`${label} ${objectId("scan")}`, { x: 50, y: 780, size: 12 });
  const bytes = await pdf.save();
  return { bytes, sha256: createHash("sha256").update(bytes).digest("hex") };
}

const okRead = (field: string, value: NonNullable<FieldRead["value"]>): FieldRead => ({
  field,
  value,
  status: "ok",
  confidence: 0.99,
});

/**
 * What the pipeline reads on each page of PRINT_FORM (tests/unit/fixtures/survey-print-form.ts):
 * three answers need a person (an unclear mood, an age past its maximum, unread notes), the rest
 * are clean.
 */
export const FLAGGED_PRINT_FORM_READS: Record<number, FieldRead[]> = {
  1: [
    { field: "mood", value: null, status: "uncertain", confidence: null },
    okRead("home", "1"),
    okRead("sport", ["football"]),
  ],
  2: [
    ...["1", "2", "3", "4", "5"].map((row) => okRead(`phq.${row}`, "0")),
    okRead("age", "150"),
    okRead("dob", "2011-02-28"),
  ],
  3: [
    { field: "notes", value: null, status: "no_prediction", confidence: null },
    okRead("sign", true),
  ],
};

type CopyScope = { hubId: string; implementerId: string; projectId: string; userId: string };

/** One printed copy of a published version, issued as the print job issues it, and never scanned. */
export async function issueCopy({
  scope,
  versionId,
  schoolId,
}: {
  scope: CopyScope;
  versionId: string;
  schoolId: string;
}) {
  return db.transaction(async (tx) => {
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
    return copy.id;
  });
}

/**
 * One printed copy of a published version whose scanned pages are ingested as the pipeline would
 * post them, so its answers are stored and flagged as a real scan's are. With `pageNumbers`, only
 * those pages are scanned. No image is uploaded: each page names one, counted as stored. `remove`
 * deletes the answers, scan and upload it made.
 */
export async function createScannedCopy({
  scope,
  versionId,
  schoolId,
  reads = FLAGGED_PRINT_FORM_READS,
  pageNumbers,
}: {
  scope: CopyScope;
  versionId: string;
  schoolId: string;
  reads?: Record<number, FieldRead[]>;
  pageNumbers?: number[];
}) {
  const questionnaireId = await issueCopy({ scope, versionId, schoolId });
  const printedPages = await db
    .select({ id: surveyQuestionnairePage.id, pageNumber: surveyQuestionnairePage.pageNumber })
    .from(surveyQuestionnairePage)
    .where(eq(surveyQuestionnairePage.questionnaireId, questionnaireId))
    .orderBy(asc(surveyQuestionnairePage.pageNumber));
  const pages = pageNumbers
    ? printedPages.filter((page) => pageNumbers.includes(page.pageNumber))
    : printedPages;

  const uploadId = objectId("surveyupload");
  await db.insert(surveyUpload).values({
    id: uploadId,
    hubId: scope.hubId,
    uploadedBy: scope.userId,
    s3Key: `scans/${uploadId}`,
    fileName: "batch.pdf",
    sha256: createHash("sha256").update(uploadId).digest("hex"),
    contentType: "application/pdf",
    byteSize: 1000,
    pageCount: pages.length,
    status: "PROCESSING",
    uploadedAt: new Date(),
  });
  const imageSha256 = createHash("sha256").update(`page image ${uploadId}`).digest("base64");
  const imageHex = hexChecksum(imageSha256);
  const posted: PostedPage[] = pages.map((page, pageIndex) => ({
    pageIndex,
    qrs: [pageQrText(page.id)],
    imageSha256,
    rotation: 0,
    aligned: true,
    quality: 0.95,
    fields: reads[page.pageNumber] ?? [],
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

  const answers = await db
    .select({ id: surveyAnswer.id, field: surveyAnswer.field })
    .from(surveyAnswer)
    .where(eq(surveyAnswer.questionnaireId, questionnaireId));
  return {
    questionnaireId,
    answerId(field: string) {
      const answer = answers.find((candidate) => candidate.field === field);
      if (!answer) throw new Error(`The copy has no answer for ${field}`);
      return answer.id;
    },
    async remove() {
      await db.delete(surveyAnswer).where(eq(surveyAnswer.questionnaireId, questionnaireId));
      await db.delete(surveyScanPage).where(eq(surveyScanPage.uploadId, uploadId));
      await db.delete(surveyUpload).where(eq(surveyUpload.id, uploadId));
    },
  };
}
