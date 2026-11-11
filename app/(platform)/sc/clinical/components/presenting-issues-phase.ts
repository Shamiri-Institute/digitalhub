import type { ClinicalCases } from "#/app/(platform)/sc/clinical/action";

export type Phase = "baseline" | "endpoint";

/** Which presenting issues the board edits: an Active case's baseline, otherwise its endpoint. */
export function presentingIssuesPhase(clinicalCase: Pick<ClinicalCases, "caseStatus">): Phase {
  return clinicalCase.caseStatus === "Active" ? "baseline" : "endpoint";
}
