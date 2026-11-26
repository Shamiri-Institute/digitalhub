import { describe, expect, it } from "vitest";

import { pageOutcomeSummary } from "#/lib/survey/scan-upload-status";

describe("a processed upload's page outcomes", () => {
  it("names each outcome that occurs, in a fixed order, with each rejection's reason", () => {
    expect(
      pageOutcomeSummary([
        { status: "REJECTED", rejectedReason: "OTHER_HUB", pages: 1 },
        { status: "UNIDENTIFIED", rejectedReason: null, pages: 2 },
        { status: "MATCHED", rejectedReason: null, pages: 40 },
        { status: "REJECTED", rejectedReason: "UNKNOWN_CODE", pages: 2 },
      ]),
    ).toBe("40 matched · 2 unidentified · 3 rejected (unknown code: 2, another hub's copy: 1)");
  });

  it("leaves out a lone reason's count, and outcomes that didn't occur", () => {
    expect(
      pageOutcomeSummary([
        { status: "DUPLICATE", rejectedReason: null, pages: 18 },
        { status: "REJECTED", rejectedReason: "UNREADABLE", pages: 3 },
      ]),
    ).toBe("18 duplicate · 3 rejected (unreadable)");
    expect(pageOutcomeSummary([])).toBe("");
  });
});
