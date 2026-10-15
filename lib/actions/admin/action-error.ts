import { ZodError } from "zod";

import { ForbiddenRoleError, UnauthenticatedError } from "#/lib/auth/require-auth-role";
import type { ActionResponse } from "#/types/actions.types";

export class AdminActionError extends Error {}

export function actionFailure(error: unknown, fallback: string): ActionResponse<never> {
  if (error instanceof ZodError) {
    return { success: false, message: error.issues[0]?.message ?? fallback };
  }
  if (
    error instanceof AdminActionError ||
    error instanceof ForbiddenRoleError ||
    error instanceof UnauthenticatedError
  ) {
    return { success: false, message: error.message };
  }
  console.error(error);
  return { success: false, message: fallback };
}
