import { z } from "zod";

import { SurveyVersionPrefill } from "#/db/enums";
import { MAX_SCAN_BYTES, SCAN_CONTENT_TYPES } from "#/lib/survey/scan-files";
import { MAX_COPIES_PER_RUN } from "#/lib/survey/serial";
import { formatBytes, stringValidation } from "#/lib/utils";

export const CreateSurveySchema = z.object({
  title: stringValidation("Please enter a title").max(255, {
    error: "Keep the title under 255 characters",
  }),
  // Printed in every questionnaire serial (WB27-000017), so short and without separators.
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9]{1,9}$/, {
      error: "Use 2 to 10 letters or digits, starting with a letter",
    }),
  description: z.string().trim().max(2000, { error: "Keep the description under 2000 characters" }),
});

export const CreateDraftVersionSchema = z.object({
  surveyId: stringValidation("Missing survey"),
  fromVersionId: stringValidation("Missing version"),
});

export const SaveDraftFormSchema = z.object({
  versionId: stringValidation("Missing version"),
  /** The revision the editor loaded; the save is refused if the draft has moved on. */
  revision: z.int().min(0),
  // Checked by checkForm, which also needs the survey's published questions.
  form: z.unknown(),
  /** A form this editor sent earlier whose reply was lost, so it may be the stored revision. */
  unconfirmedForm: z.unknown().optional(),
});

export const PublishVersionSchema = z.object({
  versionId: stringValidation("Missing version"),
  /** The revision the publisher saw laid out; publishing is refused if the draft has moved on. */
  revision: z.int().min(0),
  prefill: z.enum(SurveyVersionPrefill, { error: "Choose what each copy prints" }),
});

export const CreatePrintRunSchema = z.object({
  /** Made by the print form once per request, so a request resent after a lost reply finds its run. */
  printRunId: z.string().regex(/^surveyprintrun_[0-7][0-9a-hjkmnp-tv-z]{25}$/, {
    error: "Please reopen the form and try again",
  }),
  versionId: stringValidation("Missing version"),
  /** Admins only: a hub coordinator prints for their own hub. */
  hubId: z.string().min(1).optional(),
  request: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("COUNTS"),
      schools: z
        .array(
          z.object({
            schoolId: stringValidation("Missing school"),
            copies: z
              .int({ error: "Enter a whole number of copies" })
              .min(1, { error: "Print at least one copy" })
              .max(MAX_COPIES_PER_RUN, {
                error: `A print run has at most ${MAX_COPIES_PER_RUN} copies`,
              }),
          }),
        )
        .min(1, { error: "Choose at least one school" }),
    }),
    z.object({
      kind: z.literal("STUDENTS"),
      schools: z
        .array(
          z.object({
            schoolId: stringValidation("Missing school"),
            /** Every active student of the school prints but these. */
            excludedStudentIds: z.array(z.string().min(1)).max(MAX_COPIES_PER_RUN),
          }),
        )
        .min(1, { error: "Choose at least one school" }),
    }),
  ]),
});

const copyChangeReason = (missing: string) =>
  z
    .string()
    .trim()
    .min(3, { error: missing })
    .max(500, { error: "Keep the reason under 500 characters" });

export const VoidQuestionnaireSchema = z.object({
  questionnaireId: stringValidation("Missing copy"),
  reason: copyChangeReason("Say why this copy is void"),
});

export const VerifyQuestionnaireSchema = z.object({
  questionnaireId: stringValidation("Missing copy"),
  /** The newest history event the page showed; the verify is refused if the copy has moved on. */
  seenEventId: z.int().nullable(),
});

export const ReopenQuestionnaireSchema = z.object({
  questionnaireId: stringValidation("Missing copy"),
  reason: copyChangeReason("Say why this copy is reopened"),
  /** As for verify: the reopen is refused if the copy has moved on since the page showed it. */
  seenEventId: z.int().nullable(),
});

export const RetryPrintRunSchema = z.object({
  printRunId: stringValidation("Missing print run"),
});

export const ListPrintableStudentsSchema = z.object({
  schoolId: stringValidation("Missing school"),
  /** Admins only, as in CreatePrintRunSchema. */
  hubId: z.string().min(1).optional(),
});

export const StartScanUploadSchema = z.object({
  /** Admins only, as in CreatePrintRunSchema. */
  hubId: z.string().min(1).optional(),
  fileName: z.string().trim().min(1).max(255, { error: "Shorten the file name to 255 characters" }),
  contentType: z.enum(SCAN_CONTENT_TYPES, { error: "Choose a PDF file" }),
  byteSize: z
    .int()
    .positive({ error: "The file is empty" })
    .max(MAX_SCAN_BYTES, { error: `Choose a file of ${formatBytes(MAX_SCAN_BYTES)} or less` }),
  sha256: z.string().regex(/^[0-9a-f]{64}$/, { error: "Please choose the file again" }),
});

export const ScanUploadSchema = z.object({
  uploadId: stringValidation("Missing upload"),
});

export const PlaceScanPageSchema = z.object({
  scanPageId: stringValidation("Missing page"),
  /** As typed from the paper; case, and spaces or dashes of any kind between parts, are forgiven. */
  code: z
    .string()
    .trim()
    .min(1, { error: "Type the code printed under the QR" })
    .max(60, { error: "A page code is at most 60 characters" }),
});

/** When the reviewer's page showed the answer last reviewed, or null if it hadn't been. */
const SeenReviewedAt = z.iso.datetime().nullable();

export const AcceptAnswerSchema = z.object({
  answerId: stringValidation("Missing answer"),
  seenReviewedAt: SeenReviewedAt,
});

/** A corrected value: a code, codes, digits, a date, text or a signature; null leaves it blank. */
export const CorrectAnswerSchema = z.object({
  answerId: stringValidation("Missing answer"),
  seenReviewedAt: SeenReviewedAt,
  value: z.union([
    z.string().max(2000, { error: "Use at most 2000 characters" }),
    z.array(z.string().max(64)).max(64),
    z.literal(true),
    z.null(),
  ]),
});
