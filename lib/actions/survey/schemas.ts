import { z } from "zod";

import { SurveyVersionPrefill } from "#/db/enums";
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
