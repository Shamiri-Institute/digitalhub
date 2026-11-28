import { describe, expect, it } from "vitest";

import { pageOutcomeSummary } from "#/lib/survey/scan-upload-status";

describe("a processed upload's page outcomes", () => {
  it("names each outcome that occurs, in a fixed order, with each rejection's reason and pages set aside apart", () => {
    expect(
      pageOutcomeSummary([
        { status: "REJECTED", rejectedReason: "OTHER_HUB", pages: 1 },
        { status: "UNIDENTIFIED", rejectedReason: null, pages: 2 },
        { status: "MATCHED", rejectedReason: null, pages: 40 },
        { status: "REJECTED", rejectedReason: "UNKNOWN_CODE", pages: 2 },
        { status: "REJECTED", rejectedReason: "NOT_A_SURVEY_PAGE", pages: 4 },
      ]),
    ).toEqual([
      { kind: "MATCHED", text: "40 matched" },
      { kind: "UNIDENTIFIED", text: "2 unidentified" },
      { kind: "SET_ASIDE", text: "4 set aside" },
      { kind: "REJECTED", text: "3 rejected (unknown code: 2, another hub's copy: 1)" },
    ]);
  });

  it("leaves out a lone reason's count, and outcomes that didn't occur", () => {
    expect(
      pageOutcomeSummary([
        { status: "DUPLICATE", rejectedReason: null, pages: 18 },
        { status: "REJECTED", rejectedReason: "UNREADABLE", pages: 3 },
      ]),
    ).toEqual([
      { kind: "DUPLICATE", text: "18 duplicate" },
      { kind: "REJECTED", text: "3 rejected (unreadable)" },
    ]);
    expect(pageOutcomeSummary([])).toEqual([]);
  });
});
