import { stringValidation } from "#/lib/utils";
import { z } from "zod";

export const SessionRatingsSchema = z.object({
  mode: z.enum(["add", "view"]),
  sessionId: stringValidation("Please select a session"),
  studentBehaviorRating: z
    .number({ required_error: "Please provide a rating" })
    .min(1)
    .max(5),
  adminSupportRating: z
    .number({ required_error: "Please provide a rating" })
    .min(1)
    .max(5),
  workloadRating: z
    .number({ required_error: "Please provide a rating" })
    .min(1)
    .max(5),
  positiveHighlights: z.string().optional(),
  challenges: z.string().optional(),
  recommendations: z.string().optional(),
});

export const ScheduleNewSessionSchema = z.object({
  sessionType: stringValidation("Please select a session type"),
  schoolId: stringValidation("Please select a school"),
  sessionDate: z.coerce.date({ required_error: "Please select a date" }),
  sessionStartTime: stringValidation("Please select a start time"),
  projectId: z.string().optional(),
});
