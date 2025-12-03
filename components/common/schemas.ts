import { z } from "zod";
import { COMPLAINT_TYPES } from "#/lib/app-constants/constants";
import { stringValidation } from "#/lib/utils";

export const SubmitComplaintSchema = z.object({
  id: stringValidation("Missing ID"),
  comments: stringValidation().optional(),
  complaint: z.enum([COMPLAINT_TYPES[0]!, ...COMPLAINT_TYPES.slice(1)], {
    error: "Please select a complaint",
  }),
});
