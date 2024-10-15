import { stringValidation } from "#/lib/utils";
import { z } from "zod";

export const WeeklyFellowEvaluationSchema = z.object({
  week: z.coerce.date({ required_error: "Please select a week" }),
  mode: z.enum(["add", "view"]),
  fellowId: stringValidation("Fellow ID is required"),
  behaviourNotes: stringValidation("Please give a reason for your rating"),
  behaviourRating: z
    .number({ required_error: "Please provide a rating" })
    .min(1),
  programDeliveryNotes: stringValidation(
    "Please give a reason for your rating",
  ),
  programDeliveryRating: z
    .number({ required_error: "Please provide a rating" })
    .min(1),
  dressingAndGroomingNotes: stringValidation(
    "Please give a reason for your rating",
  ),
  dressingAndGroomingRating: z
    .number({ required_error: "Please provide a rating" })
    .min(1),
  punctualityNotes: stringValidation("Please give a reason for your rating"),
  punctualityRating: z
    .number({ required_error: "Please provide a rating" })
    .min(1),
});

export type WeeklyFellowEvaluationSchema = z.infer<
  typeof WeeklyFellowEvaluationSchema
>;
