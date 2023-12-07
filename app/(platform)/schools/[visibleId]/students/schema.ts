import { z } from "zod";

export const ComplaintSchema = z.object({
  complaint: z.string({
    required_error: "please input a complaint in the text box",
  }),
  studentId: z.string(),
  schoolId: z.string(),
  fellowId: z.string(),
});
