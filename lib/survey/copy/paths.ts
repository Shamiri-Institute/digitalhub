import type { SurveyViewer } from "#/lib/auth/survey-access";

const SURVEYS_ROOT = { project: "/admin/surveys", hub: "/hc/surveys" } as const satisfies Record<
  SurveyViewer["kind"],
  string
>;

export function copyHref(viewerKind: SurveyViewer["kind"], copyId: string) {
  return `${SURVEYS_ROOT[viewerKind]}/copies/${copyId}`;
}

export function printRunHref(viewerKind: SurveyViewer["kind"], surveyId: string, runId: string) {
  return viewerKind === "project"
    ? `/admin/surveys/${surveyId}/runs/${runId}`
    : `/hc/surveys/runs/${runId}`;
}

export function reviewAnswerHref(
  viewerKind: SurveyViewer["kind"],
  surveyId: string,
  answerId: string,
) {
  return `${SURVEYS_ROOT[viewerKind]}/review?survey=${surveyId}&answer=${answerId}`;
}

export type SurveyPagesView = "unidentified" | "set-aside" | "missing";

/** The Pages tab, on one of its views, with its filters and page of the list. */
export function surveyPagesHref(
  viewerKind: SurveyViewer["kind"],
  query: {
    view?: SurveyPagesView;
    survey?: string;
    hub?: string;
    school?: string;
    upload?: string;
    page?: string;
  } = {},
) {
  const params = new URLSearchParams(
    Object.entries(query).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
  const search = params.toString();
  return `${SURVEYS_ROOT[viewerKind]}/pages${search ? `?${search}` : ""}`;
}
