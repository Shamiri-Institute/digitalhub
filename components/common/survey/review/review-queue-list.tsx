"use client";

import Link from "next/link";

import { SURVEY_ANSWER_FLAG_LABELS, type SurveyAnswerFlag } from "#/db/enums";
import type { QueuedAnswer } from "#/lib/survey/answer-review";
import { cn } from "#/lib/utils";

export function ReviewQueueList({
  answers,
  total,
  focusedId,
  hrefFor,
}: {
  answers: QueuedAnswer[];
  total: number;
  focusedId: string | null;
  hrefFor: (answerId: string) => string;
}) {
  return (
    <nav
      aria-label="Answers to review"
      className="overflow-hidden rounded-lg bg-muted lg:sticky lg:top-4"
    >
      <ol className="max-h-[70vh] divide-y divide-grey-border overflow-y-auto">
        {answers.map((answer) => {
          const isFocused = answer.id === focusedId;
          return (
            <li key={answer.id}>
              <Link
                ref={isFocused ? keepInView : undefined}
                href={hrefFor(answer.id)}
                scroll={false}
                aria-current={isFocused ? "true" : undefined}
                className={cn(
                  "block px-4 py-3 outline-none transition-colors hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-shamiri-new-blue",
                  isFocused && "bg-blue-bg hover:bg-blue-bg",
                )}
              >
                <span className="flex items-baseline justify-between gap-2 text-xs text-shamiri-text-grey">
                  <span className="font-mono tabular-nums">{answer.serial}</span>
                  <span>Page {answer.pageNumber}</span>
                </span>
                <span
                  className={cn(
                    "mt-1 line-clamp-2 text-sm",
                    isFocused ? "font-medium text-shamiri-new-blue" : "text-shamiri-black",
                  )}
                >
                  {answer.prompt}
                </span>
                <span className="mt-1 block truncate text-xs text-shamiri-text-grey">
                  {answer.flags
                    .map((flag) => SURVEY_ANSWER_FLAG_LABELS[flag as SurveyAnswerFlag] ?? flag)
                    .join(" · ")}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      {total > answers.length && (
        <p className="border-t border-grey-border px-4 py-2 text-xs text-shamiri-text-grey">
          Showing the first {answers.length} of {total}. Filter to reach the rest.
        </p>
      )}
    </nav>
  );
}

// Keeps the focused row in view as the reviewer moves through a long queue. Scrolls the list only:
// scrollIntoView would also scroll the window, pulling a reviewer below the list back up to it.
function keepInView(row: HTMLAnchorElement | null) {
  const list = row?.closest("ol");
  if (!row || !list) return;
  const above = row.offsetTop - list.offsetTop < list.scrollTop;
  const below =
    row.offsetTop - list.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight;
  if (above || below) {
    list.scrollTop = row.offsetTop - list.offsetTop - (list.clientHeight - row.offsetHeight) / 2;
  }
}
