"use client";

import { X } from "lucide-react";
import Link from "next/link";

import {
  FilterSelect,
  useSearchParamFilter,
  withCounts,
} from "#/components/common/survey/filter-select";
import type {
  MissingPagesFilterOptions,
  MissingPagesFilters,
} from "#/lib/survey/scan-pages/missing";
import type { UnidentifiedPageHubs } from "#/lib/survey/scan-pages/unidentified";

function Total({ count, noun }: { count: number; noun: string }) {
  return (
    <p className="ml-auto pb-2 text-sm text-shamiri-text-grey" aria-live="polite">
      <span className="font-semibold text-shamiri-black tabular-nums">{count}</span> {noun}
    </p>
  );
}

export function UnidentifiedPagesFilterBar({
  hubId,
  hubOptions,
  upload,
  total,
}: {
  hubId: string | undefined;
  /** A Research admin's only; a hub coordinator's pages are their hub's. */
  hubOptions: UnidentifiedPageHubs | undefined;
  /** The one upload the list shows, with the address of the list without it. */
  upload: { fileName: string; clearHref: string } | null;
  total: number;
}) {
  // A hub is chosen across every upload, from the first page of the list.
  const choose = useSearchParamFilter(["upload", "page"]);
  return (
    <div className="flex flex-wrap items-end gap-3">
      {hubOptions && (
        <FilterSelect
          label="Hub"
          everyLabel="Every hub"
          value={hubId}
          options={withCounts(hubOptions)}
          onChange={(value) => choose("hub", value)}
        />
      )}
      {upload && (
        <div className="space-y-1">
          <span className="text-xs font-medium text-shamiri-text-grey">File</span>
          <p className="flex h-9 max-w-80 items-center gap-1 rounded-md border border-grey-border bg-white pr-1 pl-3 text-sm">
            <span className="truncate text-shamiri-black">{upload.fileName}</span>
            <Link
              href={upload.clearHref}
              aria-label="Show every file's pages"
              className="rounded p-1 text-shamiri-text-grey hover:bg-muted hover:text-shamiri-black focus-visible:ring-2 focus-visible:ring-shamiri-new-blue focus-visible:outline-none"
            >
              <X className="size-4" aria-hidden />
            </Link>
          </p>
        </div>
      )}
      <Total count={total} noun="to place" />
    </div>
  );
}

export function MissingPagesFilterBar({
  filters,
  options,
  total,
}: {
  filters: MissingPagesFilters;
  options: MissingPagesFilterOptions;
  total: number;
}) {
  const choose = useSearchParamFilter();
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
      <Total count={total} noun={total === 1 ? "copy" : "copies"} />
    </div>
  );
}
