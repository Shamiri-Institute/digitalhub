import { and, desc, eq, ne } from "drizzle-orm";

import { db } from "#/db/client";
import {
  SURVEY_VERSION_STATUS_LABELS,
  type SurveyVersionPrefill,
  SurveyVersionStatus,
} from "#/db/enums";
import { survey, surveyVersion } from "#/db/schema";
import { SurveyError } from "#/lib/actions/survey/respond";
import type { SurveyScope } from "#/lib/auth/admin-access";
import { type FormIssue, lockedQuestions } from "#/lib/survey/check-form";
import { describeProblem, type LayoutProblem } from "#/lib/survey/layout";
import { checkPublish } from "#/lib/survey/publish";
import { storePublished } from "#/lib/survey/store-published";

export type PublishVersionResult =
  | { outcome: "published" }
  | { outcome: "invalid"; issues: FormIssue[] }
  | { outcome: "unfit"; problems: LayoutProblem[] }
  | { outcome: "stale" };

export type PublishRequest = {
  versionId: string;
  revision: number;
  prefill: SurveyVersionPrefill;
};

/**
 * Publishes a draft of the scope's surveys as it is stored, at the revision the publisher saw: lays
 * out its form with the chosen prefill and stores the layout with it. From then on the version, its
 * layout included, can't change. A draft survey becomes active with its first published version; a
 * closed one stays closed. A retry whose first reply was lost finds it published and succeeds
 * again. Throws a SurveyError when the version is not the scope's or is no longer a draft.
 */
export async function publishDraftVersion(
  { userId, implementerId, projectId }: SurveyScope,
  request: PublishRequest,
): Promise<{ result: PublishVersionResult; message: string }> {
  return db.transaction(async (tx) => {
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
          eq(surveyVersion.id, request.versionId),
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
    if (isRepeatOfThisPublish(version, request)) {
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
    if (version.revision !== request.revision) {
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
    const check = checkPublish(version.form, lockedQuestions(lockingVersions), request.prefill);
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

    const stored = await storePublished(tx, {
      version,
      form: check.form,
      layout: check.layout,
      userId,
    });
    if (!stored) {
      return stale;
    }
    return stored.surveyActivated
      ? { ...published, message: `${published.message}. The survey is now active.` }
      : published;
  });
}

/** The version is already published as this request asks: a retry whose first reply was lost. */
function isRepeatOfThisPublish(
  version: { status: SurveyVersionStatus; revision: number; prefill: SurveyVersionPrefill | null },
  request: PublishRequest,
) {
  return (
    version.status === SurveyVersionStatus.PUBLISHED &&
    version.revision === request.revision &&
    version.prefill === request.prefill
  );
}
