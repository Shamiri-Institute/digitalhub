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

/** A processed or failed upload's pages stay as they are until someone runs it again. */
export const FINISHED_UPLOAD_STATUSES: readonly SurveyUploadStatus[] = [
  SurveyUploadStatus.PROCESSED,
  SurveyUploadStatus.FAILED,
];

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

/** Each outcome that occurred, in words, in the order the summary lists them. */
export function pageOutcomeSummary(
  outcomes: PageOutcome[],
): { status: SurveyScanPageStatus; text: string }[] {
  return (Object.entries(OUTCOME_WORDS) as [SurveyScanPageStatus, string][]).flatMap(
    ([status, word]) => {
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
      return [
        { status, text: reasons.length > 0 ? `${summary} (${reasons.join(", ")})` : summary },
      ];
    },
  );
}
