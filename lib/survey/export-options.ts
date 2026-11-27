import { z } from "zod";

import { SurveyQuestionnaireStatus } from "#/db/enums";

export const SURVEY_EXPORT_FILES = ["answers", "codebook"] as const;
export type SurveyExportFile = (typeof SURVEY_EXPORT_FILES)[number];

export function isSurveyExportFile(file: string): file is SurveyExportFile {
  return (SURVEY_EXPORT_FILES as readonly string[]).includes(file);
}

/** Between the codes, or labels, of a multiple-choice answer, in one cell. */
export const MULTIPLE_CODES_SEPARATOR = ";";

/**
 * A cell for a question the copy's version didn't print, so it can't be read as a question the
 * student left blank, which is empty.
 */
export const NOT_ASKED = "NOT_ASKED";

export const EXPORT_CELL_VALUES = ["codes", "text", "both"] as const;
export type ExportCellValues = (typeof EXPORT_CELL_VALUES)[number];

export const EXPORT_COPIES = ["returned", "verified", "all"] as const;
export type ExportCopies = (typeof EXPORT_COPIES)[number];

/** The copies each choice exports. A voided copy is never exported. */
export const EXPORTED_COPY_STATUSES: Record<ExportCopies, readonly SurveyQuestionnaireStatus[]> = {
  returned: [
    SurveyQuestionnaireStatus.PARTIAL,
    SurveyQuestionnaireStatus.NEEDS_REVIEW,
    SurveyQuestionnaireStatus.READY,
    SurveyQuestionnaireStatus.VERIFIED,
  ],
  verified: [SurveyQuestionnaireStatus.VERIFIED],
  all: [
    SurveyQuestionnaireStatus.ISSUED,
    SurveyQuestionnaireStatus.PARTIAL,
    SurveyQuestionnaireStatus.NEEDS_REVIEW,
    SurveyQuestionnaireStatus.READY,
    SurveyQuestionnaireStatus.VERIFIED,
  ],
};

export const SurveyExportOptionsSchema = z.object({
  versions: z
    .array(z.int().positive())
    .min(1, { error: "Choose at least one version" })
    .transform((versions) => [...new Set(versions)].toSorted((a, b) => a - b)),
  values: z.enum(EXPORT_CELL_VALUES),
  copies: z.enum(EXPORT_COPIES),
});
export type SurveyExportOptions = z.infer<typeof SurveyExportOptionsSchema>;

export function surveyExportPath(
  surveyId: string,
  file: SurveyExportFile,
  { versions, values, copies }: SurveyExportOptions,
) {
  const query = new URLSearchParams({ versions: versions.join(","), values, copies });
  return `/api/surveys/${surveyId}/export/${file}?${query}`;
}

export function surveyExportOptionsOf(query: URLSearchParams): SurveyExportOptions | null {
  const versions = query.get("versions");
  if (versions === null || !/^\d+(,\d+)*$/.test(versions)) {
    return null;
  }
  const parsed = SurveyExportOptionsSchema.safeParse({
    versions: versions.split(",").map(Number),
    values: query.get("values"),
    copies: query.get("copies"),
  });
  return parsed.success ? parsed.data : null;
}
