import { z } from "zod";

export const DropoutSchoolSchema = z.object({
  schoolId: z.string(),
  dropoutReason: z.string(),
});
