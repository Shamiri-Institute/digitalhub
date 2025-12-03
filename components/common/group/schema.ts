import { z } from "zod";
import { stringValidation } from "#/lib/utils";

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
