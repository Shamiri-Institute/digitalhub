import { SESSION_NAME_TYPES } from "#/lib/app-constants/constants";
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

export const ScheduleNewSessionSchema = z
  .object({
    sessionId: stringValidation("Please select a session type"),
    sessionType: z.enum(SESSION_NAME_TYPES),
    schoolId: z.string().optional(),
    venue: z.string().optional(),
    sessionDate: z.coerce.date({ required_error: "Please select a date" }),
    sessionStartTime: stringValidation("Please select a start time"),
    projectId: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (
      (val.sessionType === "INTERVENTION" ||
        val.sessionType === "CLINICAL" ||
        val.sessionType === "DATA_COLLECTION") &&
      val.schoolId === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Please select a school.`,
        fatal: true,
        path: ["schoolId"],
      });

      return z.NEVER;
    }

    if (
      (val.sessionType !== "INTERVENTION" &&
        val.sessionType !== "CLINICAL" &&
        val.venue === undefined) ||
      val.venue === ""
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Please enter the venue location.`,
        fatal: true,
        path: ["venue"],
      });

      return z.NEVER;
    }
  });
