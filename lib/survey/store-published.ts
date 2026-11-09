// The writes that publish a draft, shared by the publish action, the seed and test fixtures so they
// can't drift apart: the version frozen with its layout, a draft survey made active, and both in
// the audit history. Checks that the draft may be published (scope, revision, the form) are the
// caller's.

import { and, eq } from "drizzle-orm";

import type { Transaction } from "#/db/client";
import { SurveyAuditActor, SurveyStatus, SurveyVersionStatus } from "#/db/enums";
import { survey, surveyVersion } from "#/db/schema";
import { recordSurveyEvent, SurveyAuditAction, SurveyAuditEntity } from "#/lib/survey/audit";
import { type SurveyForm, summarizeForm } from "#/lib/survey/form";
import { LAYOUT_ENGINE_VERSION, type Layout } from "#/lib/survey/layout";

/**
 * Publishes the draft at `revision` with a layout of its form. Returns whether its survey became
 * active, or undefined when the draft is no longer a draft at that revision.
 */
export async function storePublished(
  tx: Transaction,
  {
    version,
    form,
    layout,
    userId,
  }: {
    version: { id: string; surveyId: string; versionNumber: number; revision: number };
    form: SurveyForm;
    layout: Layout;
    userId: string;
  },
) {
  const [stored] = await tx
    .update(surveyVersion)
    .set({
      status: SurveyVersionStatus.PUBLISHED,
      prefill: layout.prefill,
      layout,
      layoutEngineVersion: LAYOUT_ENGINE_VERSION,
      publishedAt: new Date(),
      publishedBy: userId,
    })
    .where(
      and(
        eq(surveyVersion.id, version.id),
        eq(surveyVersion.status, SurveyVersionStatus.DRAFT),
        eq(surveyVersion.revision, version.revision),
      ),
    )
    .returning({ id: surveyVersion.id });
  if (!stored) {
    return;
  }
  const actor = { kind: SurveyAuditActor.USER, userId } as const;
  await recordSurveyEvent(tx, {
    actor,
    surveyId: version.surveyId,
    entityType: SurveyAuditEntity.SURVEY_VERSION,
    entityId: version.id,
    action: SurveyAuditAction.VERSION_PUBLISHED,
    before: { status: SurveyVersionStatus.DRAFT, revision: version.revision },
    after: {
      status: SurveyVersionStatus.PUBLISHED,
      prefill: layout.prefill,
      layoutEngineVersion: LAYOUT_ENGINE_VERSION,
      ...summarizeForm(form),
    },
  });

  // A closed survey stays closed: publishing a version never reopens collection.
  const [activated] = await tx
    .update(survey)
    .set({ status: SurveyStatus.ACTIVE })
    .where(and(eq(survey.id, version.surveyId), eq(survey.status, SurveyStatus.DRAFT)))
    .returning({ id: survey.id });
  if (activated) {
    await recordSurveyEvent(tx, {
      actor,
      surveyId: version.surveyId,
      entityType: SurveyAuditEntity.SURVEY,
      entityId: version.surveyId,
      action: SurveyAuditAction.SURVEY_ACTIVATED,
      before: { status: SurveyStatus.DRAFT },
      after: { status: SurveyStatus.ACTIVE, versionNumber: version.versionNumber },
    });
  }
  return { surveyActivated: activated !== undefined };
}
