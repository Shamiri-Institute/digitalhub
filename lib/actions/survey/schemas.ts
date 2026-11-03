import { z } from "zod";

import { SurveyVersionPrefill } from "#/db/enums";
import { MAX_COPIES_PER_RUN } from "#/lib/survey/serial";
import { stringValidation } from "#/lib/utils";

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

export const VoidQuestionnaireSchema = z.object({
  questionnaireId: stringValidation("Missing copy"),
  reason: z
    .string()
    .trim()
    .min(3, { error: "Say why this copy is void" })
    .max(500, { error: "Keep the reason under 500 characters" }),
});

export const RetryPrintRunSchema = z.object({
  printRunId: stringValidation("Missing print run"),
});

export const ListPrintableStudentsSchema = z.object({
  schoolId: stringValidation("Missing school"),
  /** Admins only, as in CreatePrintRunSchema. */
  hubId: z.string().min(1).optional(),
});
