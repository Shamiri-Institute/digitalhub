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

export type ReviewSearchParams = Partial<
  Record<"survey" | "hub" | "school" | "flag" | "answer", string | string[]>
>;

function one(value: string | string[] | undefined) {
  return typeof value === "string" && value !== "" ? value : undefined;
}

export async function SurveyReview({
  viewer,
  searchParams,
  timeZone,
}: {
  viewer: SurveyViewer;
  searchParams: ReviewSearchParams;
  timeZone: string | null;
}) {
  const flag = one(searchParams.flag);
  const filters: ReviewFilters = {
    surveyId: one(searchParams.survey),
    // A hub coordinator's queue is their hub's already.
    hubId: viewer.kind === "project" ? one(searchParams.hub) : undefined,
    schoolId: one(searchParams.school),
    flag: Object.values(SurveyAnswerFlag).find((known) => known === flag),
  };

  // An answer the address names loads alongside the queue; otherwise the queue's first.
  const requestedId = one(searchParams.answer);
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
    />
  );
}
