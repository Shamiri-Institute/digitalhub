import { z } from "zod";
import { FELLOW_DROP_OUT_REASONS } from "#/lib/app-constants/constants";
import { stringValidation } from "#/lib/utils";

export const WeeklyFellowEvaluationSchema = z.object({
  week: z.coerce.date({
      error: (issue) => issue.input === undefined ? "Please select a week" : undefined
}),
  mode: z.enum(["add", "view"]),
  fellowId: stringValidation("Fellow ID is required"),
  behaviourNotes: stringValidation("Please give a reason for your rating"),
  behaviourRating: z.number({
      error: (issue) => issue.input === undefined ? "Please provide a rating" : undefined
}).min(1),
  programDeliveryNotes: stringValidation("Please give a reason for your rating"),
  programDeliveryRating: z.number({
      error: (issue) => issue.input === undefined ? "Please provide a rating" : undefined
}).min(1),
  dressingAndGroomingNotes: stringValidation("Please give a reason for your rating"),
  dressingAndGroomingRating: z.number({
      error: (issue) => issue.input === undefined ? "Please provide a rating" : undefined
}).min(1),
  punctualityNotes: stringValidation("Please give a reason for your rating"),
  punctualityRating: z.number({
      error: (issue) => issue.input === undefined ? "Please provide a rating" : undefined
}).min(1),
});

export type WeeklyFellowEvaluationSchema = z.infer<typeof WeeklyFellowEvaluationSchema>;

export const ReplaceGroupLeaderSchema = z.object({
  leaderId: stringValidation("Fellow ID is required"),
  newLeaderId: stringValidation("Please select a fellow"),
  supervisorId: stringValidation("Please select a supervisor"),
  groupId: stringValidation("Group ID is required"),
});

export const DropoutFellowSchema = z
  .object({
    fellowId: stringValidation("Missing fellow ID"),
    mode: z.enum(["dropout", "undo"]),
    dropoutReason: z
      .enum([FELLOW_DROP_OUT_REASONS[0]!, ...FELLOW_DROP_OUT_REASONS.slice(1)], {
        error: (_issue, _ctx) => "Please select one of the supplied fellow dropout reason options",
      })
      .optional(),
  })
  .superRefine((val, ctx) => {
    if (val.dropoutReason === undefined && val.mode === "dropout") {
      ctx.addIssue({
        code: "custom",
        message: "Please select reason for drop out.",
        fatal: true,
        path: ["dropoutReason"],
      });

      return z.NEVER;
    }
  });
