import { stringValidation } from "#/lib/utils";
import { z } from "zod";

export const DropoutSchoolSchema = z.object({
  schoolId: stringValidation("Missing school ID"),
  dropoutReason: stringValidation("Please select a dropoout reason"),
});
