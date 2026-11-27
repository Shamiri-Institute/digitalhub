import { SurveyQuestionnaireStatus } from "#/db/enums";
import type { SurveyViewer } from "#/lib/auth/survey-access";
import { progressStatusOf } from "#/lib/survey/ingest-rules";

export type CopyFacts = {
  status: SurveyQuestionnaireStatus;
  printedPages: number;
  /** Printed pages with no matched scan, in page order. */
  missingPageNumbers: readonly number[];
  answersNeedingReview: number;
  /** The history has moved past the newest event the page that sent the command showed. */
  changedSinceSeen: boolean;
};

/** `seenEventId` is the newest history event the page showed, or null when it showed none. */
export type CopyCommand =
  | { kind: "verify"; seenEventId: number | null }
  | { kind: "reopen"; reason: string; seenEventId: number | null };

export type CopyRefusal =
  | { kind: "void" }
  | { kind: "pages-missing"; pageNumbers: readonly number[]; printedPages: number }
  | { kind: "answers-need-review"; count: number }
  | { kind: "research-only" }
  | { kind: "changed-since-seen" };

export type CopyDecision =
  | { kind: "change"; to: SurveyQuestionnaireStatus }
  | { kind: "unchanged"; because: "already-verified" | "not-verified" }
  | { kind: "refused"; refusal: CopyRefusal };

export function progressOf(facts: CopyFacts) {
  return progressStatusOf({
    printedPages: facts.printedPages,
    matchedPages: facts.printedPages - facts.missingPageNumbers.length,
    answersNeedingReview: facts.answersNeedingReview,
  });
}

/**
 * Whether a copy may be verified or reopened, decided from its pages and answers as they are now
 * rather than its stored status. A copy is verified only when every printed page is scanned and no
 * answer waits for a person; reopening undoes someone's settled decision, so only Research may.
 */
export function decideCopyAction(
  facts: CopyFacts,
  action: CopyCommand["kind"],
  viewerKind: SurveyViewer["kind"],
): CopyDecision {
  if (facts.status === SurveyQuestionnaireStatus.VOID) {
    return { kind: "refused", refusal: { kind: "void" } };
  }
  const isVerified = facts.status === SurveyQuestionnaireStatus.VERIFIED;
  switch (action) {
    case "verify":
      if (isVerified) return { kind: "unchanged", because: "already-verified" };
      if (facts.changedSinceSeen) {
        return { kind: "refused", refusal: { kind: "changed-since-seen" } };
      }
      if (facts.missingPageNumbers.length > 0) {
        return {
          kind: "refused",
          refusal: {
            kind: "pages-missing",
            pageNumbers: facts.missingPageNumbers,
            printedPages: facts.printedPages,
          },
        };
      }
      if (facts.answersNeedingReview > 0) {
        return {
          kind: "refused",
          refusal: { kind: "answers-need-review", count: facts.answersNeedingReview },
        };
      }
      return { kind: "change", to: SurveyQuestionnaireStatus.VERIFIED };
    case "reopen":
      if (!isVerified) return { kind: "unchanged", because: "not-verified" };
      if (viewerKind !== "project") return { kind: "refused", refusal: { kind: "research-only" } };
      if (facts.changedSinceSeen) {
        return { kind: "refused", refusal: { kind: "changed-since-seen" } };
      }
      return { kind: "change", to: progressOf(facts) };
  }
}

export function refusalMessage(refusal: CopyRefusal): string {
  switch (refusal.kind) {
    case "void":
      return "This copy is void, so it can't be verified or reopened";
    case "pages-missing": {
      const { pageNumbers, printedPages } = refusal;
      if (pageNumbers.length === printedPages) return "No page has been scanned yet";
      return pageNumbers.length === 1
        ? `Page ${pageNumbers[0]} hasn't been scanned`
        : `Pages ${listed(pageNumbers)} haven't been scanned`;
    }
    case "answers-need-review":
      return refusal.count === 1
        ? "1 answer still needs review"
        : `${refusal.count} answers still need review`;
    case "research-only":
      return "Only the Research team can reopen a verified copy";
    case "changed-since-seen":
      return "This copy changed since you opened it. Look over the latest, then try again";
    default:
      return refusal satisfies never;
  }
}

function listed(numbers: readonly number[]) {
  return `${numbers.slice(0, -1).join(", ")} and ${numbers.at(-1)}`;
}
