"use server";

import { and, desc, eq, ne, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";

import { db, isUniqueViolation } from "#/db/client";
import {
  SURVEY_VERSION_STATUS_LABELS,
  SurveyAuditActor,
  SurveyStatus,
  type SurveyVersionPrefill,
  SurveyVersionStatus,
} from "#/db/enums";
import { survey, surveyVersion } from "#/db/schema";
import { requireSurveyScope } from "#/lib/auth/admin-access";
import { ForbiddenRoleError } from "#/lib/auth/require-auth-role";
import { recordSurveyEvent, SurveyAuditAction, SurveyAuditEntity } from "#/lib/survey/audit";
import { checkForm, type FormIssue, lockedQuestions } from "#/lib/survey/check-form";
import { EMPTY_FORM, summarizeForm } from "#/lib/survey/form";
import { describeProblem, LAYOUT_ENGINE_VERSION, type LayoutProblem } from "#/lib/survey/layout";
import { checkPublish } from "#/lib/survey/publish";
import type { ActionResponse } from "#/types/actions.types";
import {
  CreateDraftVersionSchema,
  CreateSurveySchema,
  PublishVersionSchema,
  SaveDraftFormSchema,
} from "./schemas";

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

export type SaveDraftFormResult =
  | { outcome: "saved"; revision: number }
  | { outcome: "invalid"; issues: FormIssue[] }
  | { outcome: "stale" };

/**
 * Saves a draft's whole form, if the draft is still at the revision the editor loaded. A save from
 * a tab that missed someone else's save is refused as stale rather than overwriting it.
 */
export async function saveDraftForm(
  data: z.infer<typeof SaveDraftFormSchema>,
): Promise<ActionResponse<SaveDraftFormResult>> {
  try {
    const { userId, implementerId, projectId } = await requireSurveyScope();
    const input = SaveDraftFormSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    const parsed = input.data;

    const result = await db.transaction(async (tx): Promise<SaveDraftFormResult> => {
      const [version] = await tx
        .select({
          id: surveyVersion.id,
          surveyId: surveyVersion.surveyId,
          versionNumber: surveyVersion.versionNumber,
          status: surveyVersion.status,
        })
        .from(surveyVersion)
        .innerJoin(survey, eq(survey.id, surveyVersion.surveyId))
        .where(
          and(
            eq(surveyVersion.id, parsed.versionId),
            eq(survey.implementerId, implementerId),
            eq(survey.projectId, projectId),
          ),
        );
      if (!version) {
        throw new SurveyError("Version not found");
      }
      if (version.status !== SurveyVersionStatus.DRAFT) {
        throw new SurveyError(`v${version.versionNumber} is published, so it can't be edited`);
      }

      // Answers to published versions already use their keys, so those keys are locked.
      const published = await tx
        .select({ versionNumber: surveyVersion.versionNumber, form: surveyVersion.form })
        .from(surveyVersion)
        .where(
          and(
            eq(surveyVersion.surveyId, version.surveyId),
            ne(surveyVersion.status, SurveyVersionStatus.DRAFT),
          ),
        )
        .orderBy(desc(surveyVersion.versionNumber));
      const check = checkForm(parsed.form, lockedQuestions(published));
      if (!check.success) {
        return { outcome: "invalid", issues: check.issues };
      }

      const form = check.form;
      /** Stores the form if the draft is still at `seen`, with its audit event; the new revision. */
      const write = async (seen: number) => {
        const [saved] = await tx
          .update(surveyVersion)
          .set({ form, revision: sql`${surveyVersion.revision} + 1` })
          .where(
            and(
              eq(surveyVersion.id, version.id),
              eq(surveyVersion.status, SurveyVersionStatus.DRAFT),
              eq(surveyVersion.revision, seen),
            ),
          )
          .returning({ revision: surveyVersion.revision });
        if (saved) {
          await recordSurveyEvent(tx, {
            actor: { kind: SurveyAuditActor.USER, userId },
            surveyId: version.surveyId,
            entityType: SurveyAuditEntity.SURVEY_VERSION,
            entityId: version.id,
            action: SurveyAuditAction.FORM_SAVED,
            before: { revision: seen },
            after: { revision: saved.revision, ...summarizeForm(form) },
          });
        }
        return saved?.revision;
      };

      const revision = await write(parsed.revision);
      if (revision !== undefined) {
        return { outcome: "saved", revision };
      }

      // The draft moved on. If the one save since is this tab's own, whose reply was lost, it is
      // not a change made elsewhere: a retry of the same form is already saved, and a newer form
      // goes on top of it.
      const [current] = await tx
        .select({
          revision: surveyVersion.revision,
          isThisForm: sql<boolean>`${surveyVersion.form} = ${JSON.stringify(form)}::jsonb`,
          isUnconfirmed:
            parsed.unconfirmedForm === undefined
              ? sql<boolean>`false`
              : sql<boolean>`${surveyVersion.form} = ${JSON.stringify(parsed.unconfirmedForm)}::jsonb`,
        })
        .from(surveyVersion)
        .where(eq(surveyVersion.id, version.id));
      if (current?.revision !== parsed.revision + 1) {
        return { outcome: "stale" };
      }
      if (current.isThisForm) {
        return { outcome: "saved", revision: current.revision };
      }
      const onTop = current.isUnconfirmed ? await write(current.revision) : undefined;
      return onTop === undefined ? { outcome: "stale" } : { outcome: "saved", revision: onTop };
    });

    switch (result.outcome) {
      case "saved":
        // So going back to this page, or to the survey's versions, shows the saved form.
        refresh();
        return { success: true, message: "Saved", data: result };
      case "invalid":
        return {
          success: false,
          message: result.issues[0]?.message ?? "Please check the form",
          data: result,
        };
      case "stale":
        return {
          success: false,
          message: "This draft was changed elsewhere. Reload to see the latest version.",
          data: result,
        };
    }
  } catch (error) {
    return failure(error, "Sorry, could not save the draft.");
  }
}

export type PublishVersionResult =
  | { outcome: "published" }
  | { outcome: "invalid"; issues: FormIssue[] }
  | { outcome: "unfit"; problems: LayoutProblem[] }
  | { outcome: "stale" };

/**
 * Publishes a draft as it is stored, at the revision the publisher saw: lays out its form with the
 * chosen prefill and stores the layout with it. From then on the version, its layout included,
 * can't change. A draft survey becomes active with its first published version; a closed one stays
 * closed. A retry whose first reply was lost finds it published and succeeds again.
 */
export async function publishVersion(
  data: z.infer<typeof PublishVersionSchema>,
): Promise<ActionResponse<PublishVersionResult>> {
  try {
    const { userId, implementerId, projectId } = await requireSurveyScope();
    const input = PublishVersionSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    const parsed = input.data;

    const { result, message } = await db.transaction(async (tx) => {
      const [version] = await tx
        .select({
          id: surveyVersion.id,
          surveyId: surveyVersion.surveyId,
          versionNumber: surveyVersion.versionNumber,
          status: surveyVersion.status,
          revision: surveyVersion.revision,
          prefill: surveyVersion.prefill,
          form: surveyVersion.form,
        })
        .from(surveyVersion)
        .innerJoin(survey, eq(survey.id, surveyVersion.surveyId))
        .where(
          and(
            eq(surveyVersion.id, parsed.versionId),
            eq(survey.implementerId, implementerId),
            eq(survey.projectId, projectId),
          ),
        )
        .for("update", { of: surveyVersion });
      if (!version) {
        throw new SurveyError("Version not found");
      }
      const published = {
        result: { outcome: "published" } as const,
        message: `Published v${version.versionNumber}`,
      };
      if (isRepeatOfThisPublish(version, parsed)) {
        return published;
      }
      if (version.status !== SurveyVersionStatus.DRAFT) {
        const status = SURVEY_VERSION_STATUS_LABELS[version.status].toLowerCase();
        throw new SurveyError(`v${version.versionNumber} is already ${status}`);
      }
      const stale = {
        result: { outcome: "stale" } as const,
        message: "This draft was changed since you opened it. Reload to see the latest version.",
      };
      if (version.revision !== parsed.revision) {
        return stale;
      }

      const lockingVersions = await tx
        .select({ versionNumber: surveyVersion.versionNumber, form: surveyVersion.form })
        .from(surveyVersion)
        .where(
          and(
            eq(surveyVersion.surveyId, version.surveyId),
            ne(surveyVersion.status, SurveyVersionStatus.DRAFT),
          ),
        )
        .orderBy(desc(surveyVersion.versionNumber));
      const check = checkPublish(version.form, lockedQuestions(lockingVersions), parsed.prefill);
      if (!check.ok) {
        const [issue] = check.issues;
        const [problem] = check.problems;
        return issue || !problem
          ? {
              result: { outcome: "invalid", issues: check.issues } as const,
              message: issue?.message ?? "Please check the form",
            }
          : {
              result: { outcome: "unfit", problems: check.problems } as const,
              message: describeProblem(problem, version.form),
            };
      }

      const [stored] = await tx
        .update(surveyVersion)
        .set({
          status: SurveyVersionStatus.PUBLISHED,
          prefill: parsed.prefill,
          layout: check.layout,
          layoutEngineVersion: LAYOUT_ENGINE_VERSION,
          publishedAt: new Date(),
          publishedBy: userId,
        })
        .where(
          and(
            eq(surveyVersion.id, version.id),
            eq(surveyVersion.status, SurveyVersionStatus.DRAFT),
            eq(surveyVersion.revision, parsed.revision),
          ),
        )
        .returning({ id: surveyVersion.id });
      if (!stored) {
        return stale;
      }
      await recordSurveyEvent(tx, {
        actor: { kind: SurveyAuditActor.USER, userId },
        surveyId: version.surveyId,
        entityType: SurveyAuditEntity.SURVEY_VERSION,
        entityId: version.id,
        action: SurveyAuditAction.VERSION_PUBLISHED,
        before: { status: SurveyVersionStatus.DRAFT, revision: version.revision },
        after: {
          status: SurveyVersionStatus.PUBLISHED,
          prefill: parsed.prefill,
          layoutEngineVersion: LAYOUT_ENGINE_VERSION,
          ...summarizeForm(check.form),
        },
      });

      const [activated] = await tx
        .update(survey)
        .set({ status: SurveyStatus.ACTIVE })
        .where(and(eq(survey.id, version.surveyId), eq(survey.status, SurveyStatus.DRAFT)))
        .returning({ id: survey.id });
      if (!activated) {
        return published;
      }
      await recordSurveyEvent(tx, {
        actor: { kind: SurveyAuditActor.USER, userId },
        surveyId: version.surveyId,
        entityType: SurveyAuditEntity.SURVEY,
        entityId: version.surveyId,
        action: SurveyAuditAction.SURVEY_ACTIVATED,
        before: { status: SurveyStatus.DRAFT },
        after: { status: SurveyStatus.ACTIVE, versionNumber: version.versionNumber },
      });
      return { ...published, message: `${published.message}. The survey is now active.` };
    });

    if (result.outcome === "published") {
      // So the builder, the survey list, its versions and later drafts see what publishing changed.
      refresh();
    }
    return { success: result.outcome === "published", message, data: result };
  } catch (error) {
    return failure(error, "Sorry, could not publish the version.");
  }
}

/** The version is already published as this request asks: a retry whose first reply was lost. */
function isRepeatOfThisPublish(
  version: { status: SurveyVersionStatus; revision: number; prefill: SurveyVersionPrefill | null },
  request: { revision: number; prefill: SurveyVersionPrefill },
) {
  return (
    version.status === SurveyVersionStatus.PUBLISHED &&
    version.revision === request.revision &&
    version.prefill === request.prefill
  );
}
