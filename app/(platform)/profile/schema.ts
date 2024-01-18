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

export const OverallFellowSchema = z.object({
  fellowBehaviourNotes: z
    .string({ required_error: "Please input fellow behaviour notes" })
    .trim()
    .min(1, { message: "Please input fellow behaviour notes" }),
  programDeliveryNotes: z
    .string({ required_error: "Please input program delivery notes" })
    .trim()
    .min(1, { message: "Please input program delivery notes" }),
  dressingAndGroomingNotes: z
    .string({ required_error: "Please input dressing and grooming notes" })
    .trim()
    .min(1, { message: "Please input dressing and grooming notes" }),
  attendanceNotes: z
    .string({ required_error: "Please input attendance notes" })
    .trim()
    .min(1, { message: "Please input attendance notes" }),
  fellowId: z.string(),
  supervisorId: z.string(),
});

export type OverallFellowSchema = z.infer<typeof OverallFellowSchema>;

export const FellowComplaintSchema = z.object({
  complaint: z
    .string({ required_error: "Please input a complaint" })
    .trim()
    .min(1, { message: "Please input a complaint " }),
  fellowId: z.string(),
  supervisorId: z.string(),
});
