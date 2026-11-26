"use server";

import { refresh } from "next/cache";
import type { z } from "zod";

import { requireSurveyViewer } from "#/lib/auth/survey-access";
import { reviewAnswer } from "#/lib/survey/answer-review";
import type { ActionResponse } from "#/types/actions.types";
import { failure, invalid } from "./respond";
import { AcceptAnswerSchema, CorrectAnswerSchema } from "./schemas";

/** Accepts an answer as it stands, for a Research admin or the hub coordinator of its copy's hub. */
export async function acceptAnswer(
  data: z.infer<typeof AcceptAnswerSchema>,
): Promise<ActionResponse> {
  try {
    const viewer = await requireSurveyViewer();
    const input = AcceptAnswerSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    await reviewAnswer(
      viewer,
      input.data.answerId,
      { kind: "accept" },
      { reviewedAt: input.data.seenReviewedAt },
    );
    refresh();
    return { success: true, message: "Accepted" };
  } catch (error) {
    return failure(error, "Sorry, could not accept the answer.");
  }
}

/** Stores the value a reviewer read on the paper, checked against the question's rules. */
export async function correctAnswer(
  data: z.infer<typeof CorrectAnswerSchema>,
): Promise<ActionResponse> {
  try {
    const viewer = await requireSurveyViewer();
    const input = CorrectAnswerSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    const { reviewStatus } = await reviewAnswer(
      viewer,
      input.data.answerId,
      { kind: "correct", value: input.data.value },
      { reviewedAt: input.data.seenReviewedAt },
    );
    refresh();
    return { success: true, message: reviewStatus === "CORRECTED" ? "Corrected" : "Accepted" };
  } catch (error) {
    return failure(error, "Sorry, could not save the correction.");
  }
}
