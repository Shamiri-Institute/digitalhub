import { AdaptationType, SupportType } from "@prisma/client";
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

    // Section 1 — Fidelity
    structuralFidelity: ratingScale(5),
    processFidelity: ratingScale(5),

    // Section 2 — Adaptations
    adaptationsMade: z.boolean({ error: "Please select an option" }),
    adaptationType: z.enum(AdaptationType).optional(),
    adaptationReason: reportText.optional(),

    // Section 3 — Student Engagement
    behavioralEngagement: ratingScale(5),
    reflectiveEngagement: ratingScale(5),

    // Section 4 — Group Climate
    psychologicalSafety: ratingScale(5),
    groupCohesion: ratingScale(5),
    climateConcerns: z.boolean({ error: "Please select an option" }),
    climateConcernsDetail: reportText.optional(),

    // Section 5 — Skill Uptake and Transfer
    skillComprehension: ratingScale(5),
    inSessionTransfer: ratingScale(4),
    homePracticeApplicable: z.boolean(),
    homePracticeEngagement: ratingScale(5).optional(),

    // Section 6 — Fellow-Group Relationship
    fellowGroupRelationship: ratingScale(5),

    // Section 7 — Implementation Context
    externalDisruptions: z.boolean({ error: "Please select an option" }),
    externalDisruptionsDetail: reportText.optional(),

    // Section 8 — Fellow Experience and Reflection
    facilitatorConfidence: ratingScale(5),
    hardestAspect: reportText.min(1, { error: "This field is required" }),
    challengeImpact: ratingScale(5),
    whatWentWell: reportText.min(1, { error: "This field is required" }),

    // Section 9 — Supervision and Support
    supportType: z.enum(SupportType, { error: "Please select an option" }),
    supportDetail: reportText.optional(),
  })
  .superRefine((val, ctx) => {
    // Item 2.1 = Yes -> 2.2 and 2.3 required
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

    // Item 4.3 = Yes -> 4.4 required
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

    // Item 5.3 applicable -> rating required; not applicable -> rating must be absent
    if (val.homePracticeApplicable && val.homePracticeEngagement === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Please select a rating",
        path: ["homePracticeEngagement"],
      });
    }

    // Item 7.1 = Yes -> 7.2 required
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

    // Item 9.2 is optional even when 9.1 != SUFFICIENT — never block submission.
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
