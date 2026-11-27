"use server";

import type { z } from "zod";

import { db } from "#/db/client";
import { requireSurveyViewer } from "#/lib/auth/survey-access";
import { applyCopyCommand } from "#/lib/survey/copy/copy";
import type { ActionResponse } from "#/types/actions.types";
import { copyActionResponse, failure, invalid } from "./respond";
import { ReopenQuestionnaireSchema, VerifyQuestionnaireSchema } from "./schemas";

export async function verifyQuestionnaire(
  data: z.infer<typeof VerifyQuestionnaireSchema>,
): Promise<ActionResponse> {
  try {
    const viewer = await requireSurveyViewer();
    const input = VerifyQuestionnaireSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    const { questionnaireId, seenEventId } = input.data;
    const result = await db.transaction((tx) =>
      applyCopyCommand(tx, viewer, questionnaireId, { kind: "verify", seenEventId }),
    );
    return copyActionResponse(result);
  } catch (error) {
    return failure(error, "Sorry, could not verify the copy.");
  }
}

export async function reopenQuestionnaire(
  data: z.infer<typeof ReopenQuestionnaireSchema>,
): Promise<ActionResponse> {
  try {
    const viewer = await requireSurveyViewer();
    const input = ReopenQuestionnaireSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    const { questionnaireId, reason } = input.data;
    const result = await db.transaction((tx) =>
      applyCopyCommand(tx, viewer, questionnaireId, { kind: "reopen", reason }),
    );
    return copyActionResponse(result);
  } catch (error) {
    return failure(error, "Sorry, could not reopen the copy.");
  }
}
