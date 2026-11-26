import {
  SURVEY_SCAN_REJECTION_LABELS,
  type SurveyScanPageStatus,
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

// In the order the summary lists them.
const OUTCOME_WORDS: Record<SurveyScanPageStatus, string> = {
  MATCHED: "matched",
  DUPLICATE: "duplicate",
  UNIDENTIFIED: "unidentified",
  REJECTED: "rejected",
};

export function pageOutcomeSummary(outcomes: PageOutcome[]) {
  return Object.entries(OUTCOME_WORDS)
    .flatMap(([status, word]) => {
      const ofStatus = outcomes.filter((outcome) => outcome.status === status);
      const pages = ofStatus.reduce((total, outcome) => total + outcome.pages, 0);
      if (pages === 0) {
        return [];
      }
      const reasons = ofStatus
        .filter((outcome): outcome is PageOutcome & { rejectedReason: SurveyScanRejection } =>
          Boolean(outcome.rejectedReason),
        )
        .toSorted((a, b) => b.pages - a.pages || a.rejectedReason.localeCompare(b.rejectedReason))
        .map(({ pages: reasonPages, rejectedReason }) => {
          const label = SURVEY_SCAN_REJECTION_LABELS[rejectedReason];
          return reasonPages === pages ? label : `${label}: ${reasonPages}`;
        });
      const summary = `${pages} ${word}`;
      return [reasons.length > 0 ? `${summary} (${reasons.join(", ")})` : summary];
    })
    .join(" · ");
}
