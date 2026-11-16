// @vitest-environment node
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildReport, ratedSessionLine } from "#/lib/fidelity-rating/rate";

// A shipped prompt is never edited: ratings record which version they used. v7 is
// evaluation-fidelity-monitoring's evals/fidelity/prompts/v7-draft.md at a0737f4, byte for byte.
const SHIPPED_PROMPTS: Record<string, string> = {
  "v7.txt": "b4ad80900acaea68c98daeff807b9134912f6125150ea4563fd415a030322ebf",
};

describe("fidelity rating", () => {
  it("never changes a shipped prompt", () => {
    const dir = path.join(process.cwd(), "lib/fidelity-rating/prompts");
    const hashes = Object.fromEntries(
      readdirSync(dir).map((file) => [
        file,
        createHash("sha256")
          .update(readFileSync(path.join(dir, file)))
          .digest("hex"),
      ]),
    );
    expect(hashes).toEqual(SHIPPED_PROMPTS);
  });

  it("rates sessions 1 to 4 only", () => {
    expect(ratedSessionLine("s3")).toBe("3 of 4 (Gratitude)");
    expect(ratedSessionLine("s0")).toBeNull();
    expect(ratedSessionLine("s5")).toBeNull();
    expect(ratedSessionLine(null)).toBeNull();
  });

  // The eval's unattributed report (evals/fidelity/cohort2.py unattributed_report) with its session
  // line, as evals/fidelity/report.py build() writes it.
  it("writes the report the eval's judge read", () => {
    const report = buildReport(
      [
        { start: 0.4, end: 4.9, text: "Good morning everyone" },
        { start: 4512, end: 4515.2, text: "Asante" },
      ],
      "1 of 4 (Growth Mindset)",
    );
    expect(report).toBe(
      [
        "# SESSION ANALYSIS REPORT\n",
        "## 1. SESSION METADATA",
        "* **Session:** 1 of 4 (Growth Mindset)",
        "* **Identified Lead:** not identified",
        "* **Lead Confidence Score:** None",
        "\n\n---\n\n",
        "## SESSION TRANSCRIPT\n",
        "### **SPEAKER** `[00:00 - 00:04]`",
        '**TEXT:** "Good morning everyone"\n',
        "### **SPEAKER** `[75:12 - 75:15]`",
        '**TEXT:** "Asante"\n',
      ].join("\n"),
    );
  });
});
