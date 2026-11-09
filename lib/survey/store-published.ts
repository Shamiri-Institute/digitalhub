// The writes that publish a draft, shared by the publish action, the seed and test fixtures so they
// can't drift apart: the version frozen with its layout and the answer fields it prints, a draft
// survey made active, and both in the audit history. Checks that the draft may be published
// (scope, revision, the form) are the caller's.

import { and, eq } from "drizzle-orm";

import type { Transaction } from "#/db/client";
import { SurveyAuditActor, SurveyFieldKind, SurveyStatus, SurveyVersionStatus } from "#/db/enums";
import { survey, surveyVersion, surveyVersionField } from "#/db/schema";
import { recordSurveyEvent, SurveyAuditAction, SurveyAuditEntity } from "#/lib/survey/audit";
import { type SurveyForm, summarizeForm } from "#/lib/survey/form";
import { LAYOUT_ENGINE_VERSION, type Layout, type ResponseField } from "#/lib/survey/layout";

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
  const versionFields = versionFieldsOf(version.id, layout);
  if (versionFields.length > 0) {
    await tx.insert(surveyVersionField).values(versionFields);
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

/** One row per answer field the layout prints, in print order. */
function versionFieldsOf(versionId: string, layout: Layout) {
  return layout.pages.flatMap((page) =>
    page.fields.map((responseField) => ({
      versionId,
      field: responseField.field,
      pageNumber: page.number,
      kind: fieldKindOf(responseField),
    })),
  );
}

// drizzle/0056_backfill_survey_version_fields.sql maps the same layout kinds for versions published
// before this table; tests/unit/survey-scan-results.test.ts checks that the two agree.
function fieldKindOf(responseField: ResponseField): SurveyFieldKind {
  switch (responseField.kind) {
    case "choice":
      return responseField.multiple
        ? SurveyFieldKind.MULTIPLE_CHOICE
        : SurveyFieldKind.SINGLE_CHOICE;
    case "digits":
      return SurveyFieldKind.DIGITS;
    case "date":
      return SurveyFieldKind.DATE;
    case "text":
      return SurveyFieldKind.TEXT;
    case "signature":
      return SurveyFieldKind.SIGNATURE;
  }
}
