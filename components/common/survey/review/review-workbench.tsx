"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { preload } from "react-dom";

import type { SurveyViewer } from "#/lib/auth/survey-access";
import type {
  AnswerForReview,
  ReviewFilterOptions,
  ReviewFilters,
  ReviewQueue,
} from "#/lib/survey/answer-review";
import { AnswerPanel } from "./answer-panel";
import { ReviewFilterBar } from "./review-filter-bar";
import { ReviewQueueList } from "./review-queue-list";

export function ReviewWorkbench({
  queue,
  filters,
  filterOptions,
  focused,
  nextAnswerId,
  nextImageUrl,
  timeZone,
  viewerKind,
}: {
  queue: ReviewQueue;
  filters: ReviewFilters;
  filterOptions: ReviewFilterOptions;
  focused: AnswerForReview | null;
  nextAnswerId: string | null;
  nextImageUrl: string | null;
  /** The viewer's, from `viewerTimeZone()`; null until the browser has set it. */
  timeZone: string | null;
  viewerKind: SurveyViewer["kind"];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hrefFor = (answerId: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (answerId) {
      params.set("answer", answerId);
    } else {
      params.delete("answer");
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  // The next answer's page is fetched while this one is reviewed, so moving on shows it at once.
  if (nextImageUrl) {
    preload(nextImageUrl, { as: "image" });
  }

  const position = queue.answers.findIndex((answer) => answer.id === focused?.id);
  const previousId = position > 0 ? (queue.answers[position - 1]?.id ?? null) : null;

  return (
    <div className="space-y-4">
      <ReviewFilterBar filters={filters} options={filterOptions} total={queue.total} />
      {queue.answers.length === 0 && !focused ? (
        <EmptyQueue filtered={Object.values(filters).some(Boolean)} />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(16rem,1fr)_2fr]">
          <ReviewQueueList
            answers={queue.answers}
            total={queue.total}
            focusedId={focused?.id ?? null}
            hrefFor={hrefFor}
          />
          {focused ? (
            <AnswerPanel
              // A new review of this answer, someone else's included, starts the panel afresh.
              key={`${focused.id} ${focused.reviewedAt?.toISOString() ?? ""}`}
              answer={focused}
              position={{
                number: position === -1 ? null : position + 1,
                total: queue.total,
                previousHref: previousId ? hrefFor(previousId) : null,
                nextHref: nextAnswerId ? hrefFor(nextAnswerId) : null,
              }}
              timeZone={timeZone}
              viewerKind={viewerKind}
              onDone={() => router.push(hrefFor(nextAnswerId), { scroll: false })}
            />
          ) : (
            <p className="rounded-lg bg-muted p-6 text-sm text-shamiri-text-grey">
              This answer isn&apos;t one you can review. Choose one from the list.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyQueue({ filtered }: { filtered: boolean }) {
  return (
    <div className="rounded-lg bg-muted px-6 py-10 text-center">
      <p className="font-medium text-shamiri-black">
        {filtered ? "No answers match these filters" : "Nothing is waiting for review"}
      </p>
      <p className="mt-1 text-sm text-shamiri-text-grey">
        {filtered
          ? "Clear a filter to see the rest of the queue."
          : "Answers land here when a scan is read and the pipeline wasn't sure, or a rule asks for a check."}
      </p>
    </div>
  );
}
