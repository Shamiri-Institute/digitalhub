// How the survey actions answer a refused or failed request. Kept out of the "use server" files,
// where every export would be a public endpoint.

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";

import { ForbiddenRoleError, NotFoundError } from "#/lib/auth/require-auth-role";
import { SurveyQuestionnaireStatus } from "#/db/enums";
import type { CopyCommandResult } from "#/lib/survey/copy/copy";
import { refusalMessage } from "#/lib/survey/copy/decide";
import { PrintRunError } from "#/lib/survey/print-run";
import type { ActionResponse } from "#/types/actions.types";

/** An expected failure whose message is safe to show the research user. */
export class SurveyError extends Error {}

export function invalid<T>(error: z.ZodError): ActionResponse<T> {
  return { success: false, message: error.issues[0]?.message ?? "Please check the form" };
}

export function failure<T>(error: unknown, fallback: string): ActionResponse<T> {
  // A user in another role is redirected to their home; let Next carry that out.
  unstable_rethrow(error);
  if (
    error instanceof SurveyError ||
    error instanceof PrintRunError ||
    error instanceof ForbiddenRoleError ||
    error instanceof NotFoundError
  ) {
    return { success: false, message: error.message };
  }
  console.error(error);
  return { success: false, message: fallback };
}

/**
 * The reply to verifying or reopening a copy. An unchanged or refused copy refreshes the page too,
 * since someone else's change can be the reason and the page should show it.
 */
export function copyActionResponse(result: CopyCommandResult): ActionResponse {
  switch (result.kind) {
    case "changed":
      refresh();
      return {
        success: true,
        message:
          result.to === SurveyQuestionnaireStatus.VERIFIED
            ? "The copy is verified"
            : "The copy is reopened",
      };
    case "unchanged":
      refresh();
      return {
        success: true,
        message:
          result.because === "already-verified"
            ? "This copy is already verified"
            : "This copy is already open",
      };
    case "refused":
      refresh();
      return { success: false, message: refusalMessage(result.refusal) };
    case "not-found":
      throw new NotFoundError("Copy");
    default:
      return result satisfies never;
  }
}
