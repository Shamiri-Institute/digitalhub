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
