import { ReviewWorkbench } from "#/components/common/survey/review/review-workbench";
import { SurveyAnswerFlag } from "#/db/enums";
import type { SurveyViewer } from "#/lib/auth/survey-access";
import {
  fetchAnswerForReview,
  fetchReviewFilterOptions,
  fetchReviewQueue,
  pageImageForAnswer,
  type ReviewFilters,
} from "#/lib/survey/answer-review";
import { searchParamValue } from "#/lib/survey/filter-options";

export type ReviewSearchParams = Partial<
  Record<"survey" | "hub" | "school" | "flag" | "answer", string | string[]>
>;

export async function SurveyReview({
  viewer,
  searchParams,
  timeZone,
}: {
  viewer: SurveyViewer;
  searchParams: ReviewSearchParams;
  timeZone: string | null;
}) {
  const flag = searchParamValue(searchParams.flag);
  const filters: ReviewFilters = {
    surveyId: searchParamValue(searchParams.survey),
    // A hub coordinator's queue is their hub's already.
    hubId: viewer.kind === "project" ? searchParamValue(searchParams.hub) : undefined,
    schoolId: searchParamValue(searchParams.school),
    flag: Object.values(SurveyAnswerFlag).find((known) => known === flag),
  };

  // An answer the address names loads alongside the queue; otherwise the queue's first.
  const requestedId = searchParamValue(searchParams.answer);
  const [queue, filterOptions, requested] = await Promise.all([
    fetchReviewQueue(viewer, filters),
    fetchReviewFilterOptions(viewer),
    requestedId ? fetchAnswerForReview(viewer, requestedId) : null,
  ]);
  const focusedId = requestedId ?? queue.answers[0]?.id;
  const position = queue.answers.findIndex((answer) => answer.id === focusedId);
  const nextId = position === -1 ? queue.answers[0]?.id : queue.answers[position + 1]?.id;
  const [focused, nextImage] = await Promise.all([
    requestedId ? requested : focusedId ? fetchAnswerForReview(viewer, focusedId) : null,
    nextId ? pageImageForAnswer(viewer, nextId) : null,
  ]);

  return (
    <ReviewWorkbench
      queue={queue}
      filters={filters}
      filterOptions={filterOptions}
      focused={focused ?? null}
      nextAnswerId={nextId ?? null}
      nextImageUrl={nextImage?.url ?? null}
      timeZone={timeZone}
      viewerKind={viewer.kind}
    />
  );
}
