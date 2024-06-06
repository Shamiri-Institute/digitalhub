import {
  BOARDING_DAY_TYPES,
  KENYAN_COUNTIES,
  SCHOOL_DEMOGRAPHICS,
  SCHOOL_DROPOUT_REASONS,
  SCHOOL_TYPES,
} from "#/lib/app-constants/constants";
import { stringValidation } from "#/lib/utils";
import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";

export const DropoutSchoolSchema = z.object({
  schoolId: stringValidation("Missing school ID"),
  // @ts-ignore
  dropoutReason: z.enum(SCHOOL_DROPOUT_REASONS, {
    errorMap: (_issue, _ctx) => ({
      message:
        "Please select one of the supplied school dropout reason options",
    }),
  }),
});

export const WeeklyHubReportSchema = z.object({
  hubId: stringValidation("Missing hub ID"),
  submittedBy: stringValidation("Missing hub coordinator ID"),
  week: z.coerce.date({ required_error: "Please select a week" }),
  recommendations: stringValidation("Please input recommendations"),
  schoolRelatedIssuesAndObservations: stringValidation(),
  schoolRelatedIssuesAndObservationRating: z.number().lte(5),
  supervisorRelatedIssuesAndObservations: stringValidation(),
  supervisorRelatedIssuesAndObservationsRating: z.number().lte(5),
  fellowRelatedIssuesAndObservations: stringValidation(),
  fellowRelatedIssuesAndObservationsRating: z.number().lte(5),
  hubRelatedIssuesAndObservations: stringValidation(),
  hubRelatedIssuesAndObservationsRating: z.number().lte(5),
  successes: stringValidation(),
  challenges: stringValidation(),
});

export const EditSchoolSchema = z.object({
  numbersExpected: z.coerce
    .number({
      required_error: "Please enter the promised number of students.",
    })
    .optional(),
  schoolEmail: z
    .string({
      required_error: "Please enter the school's email.",
    })
    .optional(),
  schoolCounty: z.enum(KENYAN_COUNTIES).optional(),
  schoolContact: z
    .string({
      required_error: "Please enter the school's contact number.",
    })
    .optional(),
  schoolDemographics: z.enum(SCHOOL_DEMOGRAPHICS).optional(),
  boardingDay: z.enum(BOARDING_DAY_TYPES).optional(),
  schoolType: z.enum(SCHOOL_TYPES).optional(),
  pointPersonName: z
    .string({ required_error: "Please enter the Point Person's Name" })
    .optional(),
  pointPersonEmail: z
    .string({ required_error: "Please enter the Point Peron's Email" })
    .email()
    .optional(),
  pointPersonPhone: z
    .string({ required_error: "Please enter the Point Person's phone number" })
    .refine((val) => isValidPhoneNumber(val, "KE"), {
      message: "Please enter a valid Kenyan Phone Number",
    })
    .optional(),
});

export const ScheduleNewSessionSchema = z.object({
  sessionType: stringValidation("Please select a session type"),
  schoolId: stringValidation("Please select a school"),
  sessionDate: z.coerce.date({ required_error: "Please select a date" }),
  sessionStartTime: stringValidation("Please select a start time"),
  sessionDuration: stringValidation("Please select the session's duration"),
  projectId: z.string().optional(),
  // notifications: stringValidation(),
  // sendReminders: stringValidation("Please select a send reminder option"),
});
