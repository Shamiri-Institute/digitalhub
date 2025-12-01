import { z } from "zod";
import { FELLOW_DROP_OUT_REASONS } from "#/lib/app-constants/constants";
import { GENDER_OPTIONS } from "#/lib/constants";
import { stringValidation } from "#/lib/utils";

export const FellowSchema = z.object({
  fellowName: stringValidation("Please enter the fellow's name."),
  fellowEmail: stringValidation("Please enter the fellow's email.").email(
    "Please enter a valid email address",
  ),
  cellNumber: stringValidation("Please enter the fellow's cell phone number."),
  mpesaName: stringValidation("Please enter the fellow's MPESA name."),
  mpesaNumber: stringValidation("Please enter the fellow's MPESA number."),
  county: z.string().optional(),
  subCounty: z.string().optional(),
  dateOfBirth: z.coerce.date({
      error: (issue) => issue.input === undefined ? "Please enter the fellow's date of birth" : undefined
}),
  gender: stringValidation("Please enter the fellow's gender."),
  idNumber: z.string().optional(),
});

export type FellowSchema = z.infer<typeof FellowSchema>;

export const WeeklyFellowRatingSchema = z.object({
  week: z.coerce.date({
      error: (issue) => issue.input === undefined ? "Please select a week" : undefined
}),
  behaviourNotes: stringValidation("Please input behaviour notes"),
  programDeliveryNotes: stringValidation("Please input program delivery notes"),
  dressingAndGroomingNotes: stringValidation("Please input dressing and grooming notes"),
  punctualityNotes: stringValidation("Please input punctuality notes"),
  fellowId: stringValidation(),
  behaviourRating: z.number().min(1, {
      error: "Please input a rating "
}),
  programDeliveryRating: z.number().min(1, {
      error: "Please input a rating "
}),
  dressingAndGroomingRating: z.number().min(1, {
      error: "Please input a rating "
}),
  punctualityRating: z.number().min(1, {
      error: "Please input a rating "
}),
});

export type WeeklyFellowRatingSchema = z.infer<typeof WeeklyFellowRatingSchema>;

export const DropoutFellowSchema = z.object({
  fellowId: stringValidation("Fellow id is required"),
  dropoutReason: z.enum(FELLOW_DROP_OUT_REASONS, {
      error: (issue) => issue.input === undefined ? "Please select a dropout reason" : undefined
}),
  replacementFellowId: stringValidation("Please select a replacement fellow"),
  replacementSupervisorId: stringValidation("Please select a supervisor"),
});

export type DropoutFellowSchema = z.infer<typeof DropoutFellowSchema>;

export const SupervisorSchema = z.object({
  supervisorEmail: z.email(),
  supervisorName: z.string().min(1),
  idNumber: z.string().min(1),
  cellNumber: z.string().min(1),
  mpesaNumber: z.string().min(1),
  dateOfBirth: z.string().optional(),
  gender: z.enum(GENDER_OPTIONS),
  county: z.string().min(1),
  subCounty: z.string().min(1),
  bankName: z.string().min(1),
  bankBranch: z.string().min(1),
});

export type SupervisorType = z.infer<typeof SupervisorSchema>;
