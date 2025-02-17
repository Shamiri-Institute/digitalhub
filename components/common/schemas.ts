import { COMPLAINT_TYPES } from "#/lib/app-constants/constants";
import { stringValidation } from "#/lib/utils";
import { z } from "zod";

export const SubmitComplaintSchema = z.object({
  id: stringValidation("Missing ID"),
  comments: stringValidation().optional(),
  complaint: z.enum([COMPLAINT_TYPES[0]!, ...COMPLAINT_TYPES.slice(1)], {
    errorMap: (_issue, _ctx) => ({
      message: "Please select a complaint",
    }),
  }),
});
