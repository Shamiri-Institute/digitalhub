import { AdaptationType, SupportType } from "#/db/enums";
import { z } from "zod";
import { stringValidation } from "#/lib/utils";

function ratingScale(max: 4 | 5) {
  return z
    .number({ error: "Please select a rating" })
    .int()
    .min(1, { error: "Please select a rating" })
    .max(max, { error: "Please select a rating" });
}

const reportText = z.string().trim().max(500, { error: "Maximum 500 characters" });

export const FellowGroupReportSchema = z
  .object({
    groupId: stringValidation("Group ID is required"),
    projectId: stringValidation("Project ID is required"),

    structuralFidelity: ratingScale(5),
    processFidelity: ratingScale(5),

    adaptationsMade: z.boolean({ error: "Please select an option" }),
    adaptationType: z.enum(AdaptationType).optional(),
    adaptationReason: reportText.optional(),

    behavioralEngagement: ratingScale(5),
    reflectiveEngagement: ratingScale(5),

    psychologicalSafety: ratingScale(5),
    groupCohesion: ratingScale(5),
    climateConcerns: z.boolean({ error: "Please select an option" }),
    climateConcernsDetail: reportText.optional(),

    skillComprehension: ratingScale(5),
    inSessionTransfer: ratingScale(4),
    homePracticeApplicable: z.boolean(),
    homePracticeEngagement: ratingScale(5).optional(),

    fellowGroupRelationship: ratingScale(5),

    externalDisruptions: z.boolean({ error: "Please select an option" }),
    externalDisruptionsDetail: reportText.optional(),

    facilitatorConfidence: ratingScale(5),
    hardestAspect: reportText.min(1, { error: "This field is required" }),
    challengeImpact: ratingScale(5),
    whatWentWell: reportText.min(1, { error: "This field is required" }),

    supportType: z.enum(SupportType, { error: "Please select an option" }),
    supportDetail: reportText.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.adaptationsMade) {
      if (!val.adaptationType) {
        ctx.addIssue({
          code: "custom",
          message: "Please select the most common adaptation type",
          path: ["adaptationType"],
        });
      }
      if (!val.adaptationReason || val.adaptationReason.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Please describe the main reason",
          path: ["adaptationReason"],
        });
      }
    }

    if (
      val.climateConcerns &&
      (!val.climateConcernsDetail || val.climateConcernsDetail.length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Please describe briefly",
        path: ["climateConcernsDetail"],
      });
    }

    if (val.homePracticeApplicable && val.homePracticeEngagement === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Please select a rating",
        path: ["homePracticeEngagement"],
      });
    }

    if (
      val.externalDisruptions &&
      (!val.externalDisruptionsDetail || val.externalDisruptionsDetail.length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Please describe briefly",
        path: ["externalDisruptionsDetail"],
      });
    }
  });

export type FellowGroupReportFormData = z.infer<typeof FellowGroupReportSchema>;

export const StudentGroupEvaluationSchema = z.object({
  mode: z.enum(["add", "view"]),
  sessionId: stringValidation("Please select a session"),
  groupId: stringValidation("Group ID is required"),
  engagementComment: stringValidation("Please give a reason for your rating"),
  engagement1: z
    .number({ error: "Please provide a rating" })
    .min(1, { error: "Please provide a rating" })
    .max(5),
  engagement2: z
    .number({ error: "Please provide a rating" })
    .min(1, { error: "Please provide a rating" })
    .max(5),
  engagement3: z
    .number({ error: "Please provide a rating" })
    .min(1, { error: "Please provide a rating" })
    .max(5),
  cooperationComment: stringValidation("Please give a reason for your rating"),
  cooperation1: z
    .number({ error: "Please provide a rating" })
    .min(1, { error: "Please provide a rating" })
    .max(5),
  cooperation2: z
    .number({ error: "Please provide a rating" })
    .min(1, { error: "Please provide a rating" })
    .max(5),
  cooperation3: z
    .number({ error: "Please provide a rating" })
    .min(1, { error: "Please provide a rating" })
    .max(5),
  contentComment: stringValidation("Please give a reason for your rating"),
  content: z
    .number({ error: "Please provide a rating" })
    .min(1, { error: "Please provide a rating" })
    .max(5),
});

export const CreateGroupSchema = z.object({
  fellowId: stringValidation("Please select a fellow"),
  supervisorId: stringValidation("Please select a supervisor"),
  schoolId: stringValidation("School ID is required"),
  groupName: z.string().optional(),
});
