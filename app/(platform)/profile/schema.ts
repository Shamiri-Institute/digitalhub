import * as z from "zod";

export const ReportingNotesSchema = z.object({
  fellowId: z.string(),
  supervisorId: z.string(),
  notes: z
    .string({
      required_error: "Please input content in the notes field",
    })
    .trim()
    .min(1, { message: "Please input content in the notes field" }),
});

export type ReportingNotesSchema = z.infer<typeof ReportingNotesSchema>;
