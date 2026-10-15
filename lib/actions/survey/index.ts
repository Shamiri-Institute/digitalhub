"use server";

import { and, desc, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";

import { db, isUniqueViolation } from "#/db/client";
import { SurveyAuditActor, SurveyVersionStatus } from "#/db/enums";
import { survey, surveyVersion } from "#/db/schema";
import { requireSurveyScope } from "#/lib/auth/admin-access";
import { ForbiddenRoleError } from "#/lib/auth/require-auth-role";
import { recordSurveyEvent, SurveyAuditAction, SurveyAuditEntity } from "#/lib/survey/audit";
import { EMPTY_FORM } from "#/lib/survey/form";
import type { ActionResponse } from "#/types/actions.types";
import { CreateDraftVersionSchema, CreateSurveySchema } from "./schemas";

/** An expected failure whose message is safe to show the research user. */
class SurveyError extends Error {}

/** The first problem with the input, worded for the form that sent it. */
function invalid<T>(error: z.ZodError): ActionResponse<T> {
  return { success: false, message: error.issues[0]?.message ?? "Please check the form" };
}

function failure<T>(error: unknown, fallback: string): ActionResponse<T> {
  // A user in another role is redirected to their home; let Next carry that out.
  unstable_rethrow(error);
  if (error instanceof SurveyError || error instanceof ForbiddenRoleError) {
    return { success: false, message: error.message };
  }
  console.error(error);
  return { success: false, message: fallback };
}

/** Creates a survey in the caller's implementer and active project, with an empty draft v1. */
export async function createSurvey(
  data: z.infer<typeof CreateSurveySchema>,
): Promise<ActionResponse<{ surveyId: string }>> {
  try {
    const { userId, implementerId, projectId } = await requireSurveyScope();
    const input = CreateSurveySchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    const parsed = input.data;
    const actor = { kind: SurveyAuditActor.USER, userId };

    const surveyId = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(survey)
        .values({
          implementerId,
          projectId,
          code: parsed.code,
          title: parsed.title,
          description: parsed.description || null,
          createdBy: userId,
        })
        .returning({ id: survey.id });
      if (!created) {
        throw new Error("Could not create the survey");
      }

      const [version] = await tx
        .insert(surveyVersion)
        .values({ surveyId: created.id, versionNumber: 1, createdBy: userId, form: EMPTY_FORM })
        .returning({ id: surveyVersion.id });
      if (!version) {
        throw new Error("Could not create the survey's first version");
      }

      await recordSurveyEvent(tx, {
        actor,
        surveyId: created.id,
        entityType: SurveyAuditEntity.SURVEY,
        entityId: created.id,
        action: SurveyAuditAction.SURVEY_CREATED,
        after: { code: parsed.code, title: parsed.title },
      });
      await recordSurveyEvent(tx, {
        actor,
        surveyId: created.id,
        entityType: SurveyAuditEntity.SURVEY_VERSION,
        entityId: version.id,
        action: SurveyAuditAction.VERSION_CREATED,
        after: { versionNumber: 1 },
      });
      return created.id;
    });

    refresh();
    return { success: true, message: `Created ${parsed.title}`, data: { surveyId } };
  } catch (error) {
    if (isUniqueViolation(error, "surveys_code_key")) {
      return { success: false, message: "A survey with this code already exists" };
    }
    return failure(error, "Sorry, could not create the survey.");
  }
}

/**
 * Starts the next draft of a survey as a copy of one of its published or retired versions' form.
 * The form keeps its question keys, so answers stay comparable across versions.
 */
export async function createDraftVersion(
  data: z.infer<typeof CreateDraftVersionSchema>,
): Promise<ActionResponse> {
  try {
    const { userId, implementerId, projectId } = await requireSurveyScope();
    const input = CreateDraftVersionSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    const parsed = input.data;

    const versionNumber = await db.transaction(async (tx) => {
      // Lock the survey, so two requests cannot both take the next version number.
      const [owned] = await tx
        .select({ id: survey.id })
        .from(survey)
        .where(
          and(
            eq(survey.id, parsed.surveyId),
            eq(survey.implementerId, implementerId),
            eq(survey.projectId, projectId),
          ),
        )
        .for("update");
      if (!owned) {
        throw new SurveyError("Survey not found");
      }

      const versions = await tx
        .select({
          id: surveyVersion.id,
          versionNumber: surveyVersion.versionNumber,
          status: surveyVersion.status,
          form: surveyVersion.form,
        })
        .from(surveyVersion)
        .where(eq(surveyVersion.surveyId, owned.id))
        .orderBy(desc(surveyVersion.versionNumber));

      const draft = versions.find((v) => v.status === SurveyVersionStatus.DRAFT);
      if (draft) {
        throw new SurveyError(
          `This survey already has a draft (v${draft.versionNumber}). Publish it first.`,
        );
      }
      const source = versions.find((v) => v.id === parsed.fromVersionId);
      if (!source) {
        throw new SurveyError("Version not found");
      }

      const nextNumber = (versions[0]?.versionNumber ?? 0) + 1;
      const [created] = await tx
        .insert(surveyVersion)
        .values({
          surveyId: owned.id,
          versionNumber: nextNumber,
          basedOnVersionId: source.id,
          createdBy: userId,
          form: source.form,
        })
        .returning({ id: surveyVersion.id });
      if (!created) {
        throw new Error("Could not create the draft version");
      }

      await recordSurveyEvent(tx, {
        actor: { kind: SurveyAuditActor.USER, userId },
        surveyId: owned.id,
        entityType: SurveyAuditEntity.SURVEY_VERSION,
        entityId: created.id,
        action: SurveyAuditAction.VERSION_CREATED,
        after: { versionNumber: nextNumber, basedOnVersionNumber: source.versionNumber },
      });
      return nextNumber;
    });

    refresh();
    return { success: true, message: `Created draft v${versionNumber}` };
  } catch (error) {
    return failure(error, "Sorry, could not create the draft.");
  }
}
