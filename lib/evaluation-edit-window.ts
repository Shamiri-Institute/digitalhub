// A saved evaluation or session report stays editable for 14 days after it is first saved. Counted
// in fixed 24-hour days so the server and every browser agree whatever their time zone.
const EDIT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export function evaluationEditDeadline(createdAt: Date) {
  return new Date(createdAt.getTime() + EDIT_WINDOW_MS);
}

export function mayEditEvaluation(createdAt: Date, now: Date) {
  return now < evaluationEditDeadline(createdAt);
}

/** Throws when `saved` exists and its edit window has closed; a new evaluation passes. */
export function requireEvaluationEditable(saved: { createdAt: Date } | undefined, now: Date) {
  if (saved && !mayEditEvaluation(saved.createdAt, now)) {
    throw new Error(
      "This evaluation can no longer be edited: evaluations lock 14 days after they are first saved.",
    );
  }
}
