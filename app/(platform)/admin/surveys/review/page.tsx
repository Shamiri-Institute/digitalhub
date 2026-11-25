import { redirect } from "next/navigation";

import { ReviewWorkbench } from "#/components/common/survey/review/review-workbench";
import { ADMIN_SURVEY_TABS } from "#/components/common/survey/survey-tabs";
import TabToggleNavigation from "#/components/common/tabs/tab-navigation";
import { ViewerTimeZoneCookie } from "#/components/common/viewer-time-zone";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { SurveyAnswerFlag } from "#/db/enums";
import { surveyScope } from "#/lib/auth/admin-access";
import {
  fetchAnswerForReview,
  fetchReviewFilterOptions,
  fetchReviewQueue,
  pageImageForAnswer,
  type ReviewFilters,
} from "#/lib/survey/answer-review";
import { viewerTimeZone } from "#/lib/viewer-time-zone";

type SearchParams = Record<"survey" | "hub" | "school" | "flag" | "answer", string | string[]>;

function one(value: string | string[] | undefined) {
  return typeof value === "string" && value !== "" ? value : undefined;
}

export default async function AdminSurveyReviewPage(props: {
  searchParams: Promise<Partial<SearchParams>>;
}) {
  const scope = await surveyScope();
  if (!scope) {
    redirect("/admin/schedule");
  }
  const searchParams = await props.searchParams;
  const flag = one(searchParams.flag);
  const filters: ReviewFilters = {
    surveyId: one(searchParams.survey),
    hubId: one(searchParams.hub),
    schoolId: one(searchParams.school),
    flag: Object.values(SurveyAnswerFlag).find((known) => known === flag),
  };

  // An answer the address names loads alongside the queue; otherwise the queue's first.
  const requestedId = one(searchParams.answer);
  const [queue, filterOptions, timeZone, requested] = await Promise.all([
    fetchReviewQueue(scope, filters),
    fetchReviewFilterOptions(scope),
    viewerTimeZone(),
    requestedId ? fetchAnswerForReview(scope, requestedId) : null,
  ]);
  const focusedId = requestedId ?? queue.answers[0]?.id;
  const position = queue.answers.findIndex((answer) => answer.id === focusedId);
  const nextId = position === -1 ? queue.answers[0]?.id : queue.answers[position + 1]?.id;
  const [focused, nextImage] = await Promise.all([
    requestedId ? requested : focusedId ? fetchAnswerForReview(scope, focusedId) : null,
    nextId ? pageImageForAnswer(scope, nextId) : null,
  ]);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="container w-full grow space-y-6 py-10">
        <PageHeading title="Surveys" />
        <TabToggleNavigation options={ADMIN_SURVEY_TABS} className="px-0" />
        <Separator />
        <ReviewWorkbench
          queue={queue}
          filters={filters}
          filterOptions={filterOptions}
          focused={focused ?? null}
          nextAnswerId={nextId ?? null}
          nextImageUrl={nextImage?.url ?? null}
          timeZone={timeZone}
        />
        <ViewerTimeZoneCookie serverTimeZone={timeZone} />
      </div>
      <PageFooter />
    </div>
  );
}
