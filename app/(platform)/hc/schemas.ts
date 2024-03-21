import { SCHOOL_DROPOUT_REASONS } from "#/lib/app-constants/constants";
import { stringValidation } from "#/lib/utils";
import { z } from "zod";

export const DropoutSchoolSchema = z.object({
  schoolId: stringValidation("Missing school ID"),
  // @ts-ignore
  dropoutReason: z.enum(SCHOOL_DROPOUT_REASONS, {
    errorMap: (_issue, _ctx) => ({
      message:
        "Please select one of the supplied school dropout reason options",
    }),
  }),
});

export const WeeklyHubReportSchema = z.object({
  week: z.date(),
  positiveHighlights: stringValidation("Please input postive highlights"),
  reportedChallenges: stringValidation("Please input reported challenges"),
  recommendations: stringValidation("Please input recommendations"),
});
