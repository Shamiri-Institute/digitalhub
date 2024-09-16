import { FELLOW_DROP_OUT_REASONS } from "#/lib/app-constants/constants";
import { stringValidation } from "#/lib/utils";
import { z } from "zod";

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
    required_error: "Please enter the fellow's date of birth",
  }),
  gender: stringValidation("Please enter the fellow's gender."),
  idNumber: z.string().optional(),
});

export type FellowSchema = z.infer<typeof FellowSchema>;

export const WeeklyFellowRatingSchema = z.object({
  week: z.coerce.date({ required_error: "Please select a week" }),
  behaviourNotes: stringValidation("Please input behaviour notes"),
  programDeliveryNotes: stringValidation("Please input program delivery notes"),
  dressingAndGroomingNotes: stringValidation(
    "Please input dressing and grooming notes",
  ),
  punctualityNotes: stringValidation("Please input punctuality notes"),
  fellowId: stringValidation(),
  behaviourRating: z.number().min(1, { message: "Please input a rating " }),
  programDeliveryRating: z
    .number()
    .min(1, { message: "Please input a rating " }),
  dressingAndGroomingRating: z
    .number()
    .min(1, { message: "Please input a rating " }),
  punctualityRating: z.number().min(1, { message: "Please input a rating " }),
});

export type WeeklyFellowRatingSchema = z.infer<typeof WeeklyFellowRatingSchema>;

export const DropoutFellowSchema = z.object({
  fellowId: stringValidation("Fellow id is required"),
  dropoutReason: z.enum(FELLOW_DROP_OUT_REASONS, {
    required_error: "Please select a dropoutReason",
  }),
  replacementFellowId: stringValidation("Please select a replacement fellow"),
  replacementSupervisorId: z.string().optional(),
});

export type DropoutFellowSchema = z.infer<typeof DropoutFellowSchema>;
