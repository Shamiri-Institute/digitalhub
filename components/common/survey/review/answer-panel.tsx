"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Badge } from "#/components/ui/badge";
import { Button, buttonVariants } from "#/components/ui/button";
import { toastOnFailure } from "#/components/ui/use-toast";
import {
  SURVEY_ANSWER_FLAG_LABELS,
  SURVEY_ANSWER_READ_STATUS_LABELS,
  SURVEY_ANSWER_REVIEW_STATUS_LABELS,
  SurveyAnswerFlag,
  SurveyAnswerReviewStatus,
  SurveyQuestionnaireStatus,
} from "#/db/enums";
import { acceptAnswer, correctAnswer } from "#/lib/actions/survey/answer-review";
import {
  type AnswerValue,
  changesAnswer,
  isSettledCopy,
  normalisedAnswer,
  pipelineReadText,
  reviewedByAPerson,
} from "#/lib/survey/answer-fields";
import type { AnswerForReview } from "#/lib/survey/answer-review";
import { cn } from "#/lib/utils";
import { AnswerCutout } from "./answer-cutout";
import { AnswerHistory } from "./answer-history";
import { AnswerInput } from "./answer-input";

export type QueuePosition = {
  /** From 1; null when this answer isn't in the filtered queue, such as one just reviewed. */
  number: number | null;
  total: number;
  previousHref: string | null;
  nextHref: string | null;
};

export function AnswerPanel({
  answer,
  position,
  timeZone,
  onDone,
}: {
  answer: AnswerForReview;
  position: QueuePosition;
  timeZone: string | null;
  /** Moves on once a decision is saved. */
  onDone: () => void;
}) {
  const [draft, setDraft] = useState<AnswerValue | null>(answer.value);
  const [wholePage, setWholePage] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const question = answer.question;
  const waiting = answer.reviewStatus === SurveyAnswerReviewStatus.NEEDS_REVIEW;
  const acceptable = !reviewedByAPerson(answer.reviewStatus);
  const copySettled = isSettledCopy(answer.copy.status);
  const changed = changesAnswer(draft, answer.value);
  const draftIsBlank = normalisedAnswer(draft) === null;
  // The server refuses to accept a value that breaks the form's rules; it has to be corrected.
  const breaksRules = answer.flags.includes(SurveyAnswerFlag.BREAKS_FORM_RULE);
  const seenReviewedAt = answer.reviewedAt?.toISOString() ?? null;

  // One decision: accept the value as it stands, or save the reviewer's change to it.
  const decide = () =>
    startSaving(() =>
      toastOnFailure(async () => {
        setProblem(null);
        const response = changed
          ? await correctAnswer({
              answerId: answer.id,
              value: normalisedAnswer(draft),
              seenReviewedAt,
            })
          : await acceptAnswer({ answerId: answer.id, seenReviewedAt });
        if (response.success) {
          onDone();
        } else {
          setProblem(response.message);
        }
      }),
    );

  return (
    <article
      className="overflow-hidden rounded-lg border border-grey-border bg-white"
      aria-busy={isSaving}
    >
      <nav
        aria-label="Position in the queue"
        className="flex items-center justify-between gap-2 border-b border-grey-border bg-grey-bg px-3 py-1.5"
      >
        <StepLink href={position.previousHref} direction="previous" />
        <span className="text-xs text-shamiri-text-grey tabular-nums">
          {position.number === null
            ? `${position.total} to review`
            : `${position.number} of ${position.total}`}
        </span>
        <StepLink href={position.nextHref} direction="next" />
      </nav>

      <div className="space-y-5 p-5">
        <header className="space-y-2">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-shamiri-text-grey">
            <span className="font-mono font-medium text-shamiri-black tabular-nums">
              {answer.copy.serial}
            </span>
            <span>{answer.copy.schoolName}</span>
            <span>Page {answer.copy.pageNumber}</span>
          </p>
          <h2 className="text-lg font-semibold text-balance text-shamiri-black">
            {question?.rowLabel ?? question?.prompt ?? answer.field}
          </h2>
          {question?.rowLabel && (
            <p className="text-sm text-shamiri-text-grey">{question.prompt}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {answer.flags.map((flag) => (
              <Badge key={flag} variant="warning">
                {SURVEY_ANSWER_FLAG_LABELS[flag as SurveyAnswerFlag] ?? flag}
              </Badge>
            ))}
            {!waiting && (
              <Badge variant="shamiri-green">
                {SURVEY_ANSWER_REVIEW_STATUS_LABELS[answer.reviewStatus]}
              </Badge>
            )}
          </div>
        </header>

        <AnswerCutout
          image={answer.image}
          wholePage={wholePage}
          onToggleWholePage={() => setWholePage((shown) => !shown)}
        />

        <p className="text-sm">
          <span className="text-shamiri-text-grey">The pipeline read </span>
          <span className="font-medium text-shamiri-black">
            {pipelineReadText(question?.input, answer.recognizedValue, answer.readStatus)}
          </span>
          {answer.readStatus && (
            <span className="text-shamiri-text-grey">
              {" "}
              ({SURVEY_ANSWER_READ_STATUS_LABELS[answer.readStatus].toLowerCase()})
            </span>
          )}
          {answer.readDetail?.raw && (
            <span className="text-shamiri-text-grey">
              ; it could make out{" "}
              <span className="font-mono text-shamiri-black">{answer.readDetail.raw}</span>
            </span>
          )}
        </p>

        {copySettled ? (
          <p className="rounded-md bg-muted px-4 py-3 text-sm text-shamiri-text-grey">
            {answer.copy.status === SurveyQuestionnaireStatus.VOID
              ? "This copy is void, so its answers can't change."
              : "This copy is verified, so its answers can't change."}
          </p>
        ) : !answer.viewerMayChange ? (
          <p className="rounded-md bg-muted px-4 py-3 text-sm text-shamiri-text-grey">
            Someone else reviewed this answer, so only the Research team can change it.
          </p>
        ) : question ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              decide();
            }}
          >
            <AnswerInput
              input={question.input}
              marks={answer.readDetail?.marks ?? []}
              value={draft}
              onChange={(value) => {
                setProblem(null);
                setDraft(value);
              }}
              disabled={isSaving}
            />
            {problem && (
              <p role="alert" className="rounded-md bg-red-bg px-3 py-2 text-sm text-red-base">
                {problem}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 border-t border-grey-border pt-4">
              <Button
                type="submit"
                // Accepting a blank is the decision most worth a second look, so it isn't the bold one.
                variant={!changed && draftIsBlank ? "outline" : "brand"}
                disabled={isSaving || (!changed && (!acceptable || breaksRules))}
                loading={isSaving}
              >
                {changed ? "Save correction" : draftIsBlank ? "Accept as blank" : "Accept"}
              </Button>
              {position.nextHref && (
                <Link
                  href={position.nextHref}
                  scroll={false}
                  className={buttonVariants({ variant: "ghost" })}
                >
                  Skip for now
                </Link>
              )}
              <p className="ml-auto text-sm text-shamiri-text-grey" aria-live="polite">
                {changed
                  ? "You changed the value; saving records your correction."
                  : !acceptable
                    ? "Already reviewed. Change the value to correct it."
                    : breaksRules
                      ? "This value breaks the form's rules: enter what the page shows."
                      : draftIsBlank && question.required
                        ? "Required, but blank on the page? Accept it as blank to confirm."
                        : draftIsBlank
                          ? "Enter what is written, or accept it as blank if the page is empty."
                          : "Accept if the page shows this value."}
              </p>
            </div>
          </form>
        ) : (
          <p className="text-sm text-red-base">
            The form has no question for {answer.field}, so this answer can&apos;t be reviewed here.
          </p>
        )}

        <AnswerHistory answer={answer} timeZone={timeZone} />
      </div>
    </article>
  );
}

function StepLink({ href, direction }: { href: string | null; direction: "previous" | "next" }) {
  const label = direction === "previous" ? "Previous" : "Next";
  const className = cn(
    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm",
    href
      ? "text-shamiri-new-blue hover:bg-white focus-visible:ring-2 focus-visible:ring-shamiri-new-blue focus-visible:outline-none"
      : "pointer-events-none text-shamiri-text-grey/60",
  );
  const content =
    direction === "previous" ? (
      <>
        <ChevronLeft className="size-4" aria-hidden /> {label}
      </>
    ) : (
      <>
        {label} <ChevronRight className="size-4" aria-hidden />
      </>
    );
  return href ? (
    <Link href={href} scroll={false} className={className}>
      {content}
    </Link>
  ) : (
    <span className={className} aria-disabled>
      {content}
    </span>
  );
}
