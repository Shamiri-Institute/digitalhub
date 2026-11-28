import {
  SURVEY_SCAN_REJECTION_LABELS,
  type SurveyScanPageStatus,
  SurveyScanRejection,
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

/** A page's outcome as the summary names it: its status, or set aside by a person. */
export type PageOutcomeKind = SurveyScanPageStatus | "SET_ASIDE";

// In the order the summary lists them.
const OUTCOME_WORDS: Record<PageOutcomeKind, string> = {
  MATCHED: "matched",
  DUPLICATE: "duplicate",
  UNIDENTIFIED: "unidentified",
  SET_ASIDE: "set aside",
  REJECTED: "rejected",
};

function kindOf(outcome: PageOutcome): PageOutcomeKind {
  return outcome.rejectedReason === SurveyScanRejection.NOT_A_SURVEY_PAGE
    ? "SET_ASIDE"
    : outcome.status;
}

/** Each outcome that occurred, in words, in the order the summary lists them. */
export function pageOutcomeSummary(
  outcomes: PageOutcome[],
): { kind: PageOutcomeKind; text: string }[] {
  return (Object.entries(OUTCOME_WORDS) as [PageOutcomeKind, string][]).flatMap(([kind, word]) => {
    const ofKind = outcomes.filter((outcome) => kindOf(outcome) === kind);
    const pages = ofKind.reduce((total, outcome) => total + outcome.pages, 0);
    if (pages === 0) {
      return [];
    }
    const reasons = ofKind
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
      {
        kind,
        text:
          kind === "REJECTED" && reasons.length > 0
            ? `${summary} (${reasons.join(", ")})`
            : summary,
      },
    ];
  });
}
