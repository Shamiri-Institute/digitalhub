import { SCHOOL_DROPOUT_REASONS } from "#/lib/app-constants/constants";
import { stringValidation } from "#/lib/utils";
import { z } from "zod";

export const DropoutSchoolSchema = z.object({
  schoolId: stringValidation("Missing school ID"),
  dropoutReason: z.enum(SCHOOL_DROPOUT_REASONS, {
    errorMap: (_issue, _ctx) => ({
      message:
        "Please select one of the supplied school dropout reason options",
    }),
  }),
});
