import { z } from "zod";

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
