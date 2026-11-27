// @vitest-environment node
import { describe, expect, it } from "vitest";

import type { SurveyQuestionnaireStatus } from "#/db/enums";
import { type CopyFacts, decideCopyAction, refusalMessage } from "#/lib/survey/copy/decide";

const facts = (
  status: SurveyQuestionnaireStatus,
  missingPageNumbers: number[] = [],
  answersNeedingReview = 0,
  changedSinceSeen = false,
): CopyFacts => ({
  status,
  printedPages: 3,
  missingPageNumbers,
  answersNeedingReview,
  changedSinceSeen,
});

describe("deciding whether a copy may be verified or reopened", () => {
  it.each([
    ["READY", facts("READY"), "project", { kind: "change", to: "VERIFIED" }],
    ["READY, by a hub coordinator", facts("READY"), "hub", { kind: "change", to: "VERIFIED" }],
    // The counts decide, not a stored status that fell behind them.
    [
      "stored NEEDS_REVIEW, nothing left",
      facts("NEEDS_REVIEW"),
      "hub",
      { kind: "change", to: "VERIFIED" },
    ],
    [
      "stored READY, an answer flagged",
      facts("READY", [], 1),
      "project",
      { kind: "refused", refusal: { kind: "answers-need-review", count: 1 } },
    ],
    [
      "PARTIAL",
      facts("PARTIAL", [2, 3]),
      "project",
      { kind: "refused", refusal: { kind: "pages-missing", pageNumbers: [2, 3], printedPages: 3 } },
    ],
    [
      "PARTIAL with flagged answers: missing pages first",
      facts("PARTIAL", [3], 2),
      "project",
      { kind: "refused", refusal: { kind: "pages-missing", pageNumbers: [3], printedPages: 3 } },
    ],
    ["VERIFIED", facts("VERIFIED"), "project", { kind: "unchanged", because: "already-verified" }],
    // A retry after someone else verified it is not refused for the event that verify added.
    [
      "VERIFIED since it was seen",
      facts("VERIFIED", [], 0, true),
      "project",
      { kind: "unchanged", because: "already-verified" },
    ],
    [
      "READY, changed since it was seen",
      facts("READY", [], 0, true),
      "hub",
      { kind: "refused", refusal: { kind: "changed-since-seen" } },
    ],
    ["VOID", facts("VOID"), "project", { kind: "refused", refusal: { kind: "void" } }],
  ] as const)("verify: %s", (_, copy, viewerKind, decision) => {
    expect(decideCopyAction(copy, "verify", viewerKind)).toEqual(decision);
  });

  it.each([
    ["VERIFIED, all clean", facts("VERIFIED"), "project", { kind: "change", to: "READY" }],
    // A copy verified before a flag was raised again reopens to what its answers now say.
    [
      "VERIFIED, one flagged",
      facts("VERIFIED", [], 1),
      "project",
      { kind: "change", to: "NEEDS_REVIEW" },
    ],
    [
      "VERIFIED, by a hub coordinator",
      facts("VERIFIED"),
      "hub",
      { kind: "refused", refusal: { kind: "research-only" } },
    ],
    ["READY", facts("READY"), "project", { kind: "unchanged", because: "not-verified" }],
    [
      "READY, by a hub coordinator",
      facts("READY"),
      "hub",
      { kind: "unchanged", because: "not-verified" },
    ],
    ["VOID", facts("VOID"), "project", { kind: "refused", refusal: { kind: "void" } }],
  ] as const)("reopen: %s", (_, copy, viewerKind, decision) => {
    expect(decideCopyAction(copy, "reopen", viewerKind)).toEqual(decision);
  });
});

describe("what a refusal says", () => {
  it.each([
    [{ kind: "answers-need-review", count: 1 }, "1 answer still needs review"],
    [{ kind: "answers-need-review", count: 3 }, "3 answers still need review"],
    [{ kind: "pages-missing", pageNumbers: [2], printedPages: 3 }, "Page 2 hasn't been scanned"],
    [
      { kind: "pages-missing", pageNumbers: [2, 3], printedPages: 3 },
      "Pages 2 and 3 haven't been scanned",
    ],
    [
      { kind: "pages-missing", pageNumbers: [2, 3, 4], printedPages: 5 },
      "Pages 2, 3 and 4 haven't been scanned",
    ],
    [
      { kind: "pages-missing", pageNumbers: [1, 2, 3], printedPages: 3 },
      "No page has been scanned yet",
    ],
    [{ kind: "research-only" }, "Only the Research team can reopen a verified copy"],
    [{ kind: "void" }, "This copy is void, so it can't be verified or reopened"],
    [
      { kind: "changed-since-seen" },
      "This copy changed since you opened it. Reload to see the latest",
    ],
  ] as const)("%o", (refusal, message) => {
    expect(refusalMessage(refusal)).toBe(message);
  });
});
