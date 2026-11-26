import {
  SURVEY_SCAN_REJECTION_LABELS,
  SurveyScanPageStatus,
  type SurveyScanRejection,
  SurveyUploadStatus,
} from "#/db/enums";

export type PageOutcome = {
  status: SurveyScanPageStatus;
  rejectedReason: SurveyScanRejection | null;
  pages: number;
};

/** Stuck ones included: a stuck job may still recover, and the page should show it when it does. */
export function isUploadUnfinished(status: SurveyUploadStatus) {
  return (
    status === SurveyUploadStatus.UPLOADED ||
    status === SurveyUploadStatus.QUEUED ||
    status === SurveyUploadStatus.PROCESSING
  );
}

export function mayRunAgain(upload: { status: SurveyUploadStatus; stuck: boolean }) {
  return upload.status === SurveyUploadStatus.FAILED || upload.stuck;
}

const OUTCOME_ORDER = [
  SurveyScanPageStatus.MATCHED,
  SurveyScanPageStatus.DUPLICATE,
  SurveyScanPageStatus.UNIDENTIFIED,
  SurveyScanPageStatus.REJECTED,
] as const;

export function pageOutcomeSummary(outcomes: PageOutcome[]) {
  return OUTCOME_ORDER.flatMap((status) => {
    const ofStatus = outcomes.filter((outcome) => outcome.status === status);
    const pages = ofStatus.reduce((total, outcome) => total + outcome.pages, 0);
    if (pages === 0) {
      return [];
    }
    const reasons = ofStatus
      .filter((outcome): outcome is PageOutcome & { rejectedReason: SurveyScanRejection } =>
        Boolean(outcome.rejectedReason),
      )
      .toSorted((a, b) => b.pages - a.pages)
      .map(({ pages: reasonPages, rejectedReason }) => {
        const label = SURVEY_SCAN_REJECTION_LABELS[rejectedReason];
        return reasonPages === pages ? label : `${reasonPages} ${label}`;
      });
    const summary = `${pages} ${status.toLowerCase()}`;
    return [reasons.length > 0 ? `${summary} (${reasons.join(", ")})` : summary];
  }).join(" · ");
}
