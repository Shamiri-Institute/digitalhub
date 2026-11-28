"use client";

import {
  FilterSelect,
  useSearchParamFilter,
  withCounts,
} from "#/components/common/survey/filter-select";
import { SURVEY_ANSWER_FLAG_LABELS, SurveyAnswerFlag } from "#/db/enums";
import type { ReviewFilterOptions, ReviewFilters } from "#/lib/survey/answer-review";

export function ReviewFilterBar({
  filters,
  options,
  total,
}: {
  filters: ReviewFilters;
  options: ReviewFilterOptions;
  total: number;
}) {
  // A new filter starts the queue from its first answer.
  const choose = useSearchParamFilter(["answer"]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <FilterSelect
        label="Survey"
        everyLabel="Every survey"
        value={filters.surveyId}
        options={withCounts(options.surveys)}
        onChange={(value) => choose("survey", value)}
      />
      {options.hubs && (
        <FilterSelect
          label="Hub"
          everyLabel="Every hub"
          value={filters.hubId}
          options={withCounts(options.hubs)}
          onChange={(value) => choose("hub", value)}
        />
      )}
      <FilterSelect
        label="School"
        everyLabel="Every school"
        value={filters.schoolId}
        options={withCounts(options.schools)}
        onChange={(value) => choose("school", value)}
      />
      <FilterSelect
        label="Reason"
        everyLabel="Every reason"
        value={filters.flag}
        options={Object.values(SurveyAnswerFlag).map((flag) => ({
          value: flag,
          label: SURVEY_ANSWER_FLAG_LABELS[flag],
        }))}
        onChange={(value) => choose("flag", value)}
      />
      <p className="ml-auto pb-2 text-sm text-shamiri-text-grey" aria-live="polite">
        <span className="font-semibold text-shamiri-black tabular-nums">{total}</span> to review
      </p>
    </div>
  );
}
