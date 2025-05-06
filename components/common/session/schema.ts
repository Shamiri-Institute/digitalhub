import {
  OCCURRENCE_STATUS,
  SESSION_NAME_TYPES,
} from "#/lib/app-constants/constants";
import { stringValidation } from "#/lib/utils";
import { z } from "zod";

export const SessionRatingsSchema = z.object({
  mode: z.enum(["add", "view"]),
  ratingId: z.string().optional(),
  sessionId: stringValidation("Session ID required"),
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
    sessionDate: z
      .date({
        required_error: "Please select a date",
        invalid_type_error: "Please select a date",
      })
      .transform((val) => {
        if (!val) {
          throw new Error("Please select a date");
        }
        return val;
      }),
    sessionStartTime: stringValidation("Please select a start time"),
  })
  .superRefine((val, ctx) => {
    if (
      (val.sessionType === "INTERVENTION" ||
        val.sessionType === "CLINICAL" ||
        val.sessionType === "DATA_COLLECTION") &&
      (val.schoolId === undefined || val.schoolId === "")
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
      (val.sessionType === "SUPERVISION" || val.sessionType === "TRAINING") &&
      (val.venue === undefined || val.venue === "")
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

export const MarkSessionOccurrenceSchema = z.object({
  occurrence: z.enum(OCCURRENCE_STATUS, {
    errorMap: (issue, _ctx) => ({
      message: "Please mark occurrence",
    }),
  }),
  sessionId: stringValidation("session ID is required"),
});

export const RescheduleSessionSchema = z.object({
  sessionDate: z.coerce.date({ required_error: "Please select a date" }),
  sessionStartTime: stringValidation("Please select a start time"),
});
