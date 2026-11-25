"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { SURVEY_ANSWER_FLAG_LABELS, SurveyAnswerFlag } from "#/db/enums";
import type { ReviewFilterOptions, ReviewFilters } from "#/lib/survey/answer-review";

// Radix Select can't hold an empty value, so "every" option has a value of its own.
const EVERY = "every";

type FilterKey = "survey" | "hub" | "school" | "flag";

export function ReviewFilterBar({
  filters,
  options,
  total,
}: {
  filters: ReviewFilters;
  options: ReviewFilterOptions;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // A new filter starts the queue from its first answer.
  const choose = (key: FilterKey, value: string) => {
    const params = new URLSearchParams(searchParams);
    params.delete("answer");
    if (value === EVERY) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const withCounts = (options: ReviewFilterOptions["surveys"]) =>
    options.map((option) => ({ value: option.id, label: `${option.label} (${option.waiting})` }));

  return (
    <div className="flex flex-wrap items-end gap-3">
      <FilterSelect
        label="Survey"
        everyLabel="Every survey"
        value={filters.surveyId}
        options={withCounts(options.surveys)}
        onChange={(value) => choose("survey", value)}
      />
      <FilterSelect
        label="Hub"
        everyLabel="Every hub"
        value={filters.hubId}
        options={withCounts(options.hubs)}
        onChange={(value) => choose("hub", value)}
      />
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

function FilterSelect({
  label,
  everyLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  everyLabel: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-shamiri-text-grey">{label}</span>
      <Select value={value ?? EVERY} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EVERY}>{everyLabel}</SelectItem>
          {/* A filter chosen before its last answer was reviewed stays visible. */}
          {value && !options.some((option) => option.value === value) && (
            <SelectItem value={value}>Nothing waiting here</SelectItem>
          )}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
