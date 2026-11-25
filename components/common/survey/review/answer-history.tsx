import { SURVEY_ANSWER_REVIEW_STATUS_LABELS, type SurveyAnswerReviewStatus } from "#/db/enums";
import { formatDateTimeIn } from "#/lib/date-utils";
import type { AnswerValue } from "#/lib/survey/answer-fields";
import type { AnswerForReview } from "#/lib/survey/answer-review";
import { formatAnswer, pipelineReadText } from "#/lib/survey/answer-fields";

type Change = { value?: AnswerValue | null; reviewStatus?: SurveyAnswerReviewStatus };

/** The answer's life: what the pipeline read, then every review, oldest first. */
export function AnswerHistory({
  answer,
  timeZone,
}: {
  answer: AnswerForReview;
  timeZone: string | null;
}) {
  const input = answer.question?.input;
  const show = (value: AnswerValue | null | undefined) =>
    input ? formatAnswer(input, value) : JSON.stringify(value ?? null);
  return (
    <details
      className="group rounded-lg bg-muted px-4 py-3 text-sm"
      open={answer.history.length > 0}
    >
      <summary className="cursor-pointer font-medium text-shamiri-black">
        History
        <span className="ml-2 font-normal text-shamiri-text-grey">
          {answer.history.length === 0
            ? "not reviewed yet"
            : `${answer.history.length} ${answer.history.length === 1 ? "review" : "reviews"}`}
        </span>
      </summary>
      <ol className="mt-3 space-y-2">
        <li className="text-shamiri-text-grey">
          Read by the pipeline as{" "}
          <span className="text-shamiri-black">
            {pipelineReadText(input, answer.recognizedValue, answer.readStatus)}
          </span>
        </li>
        {answer.history.map((event) => {
          const before = (event.before ?? {}) as Change;
          const after = (event.after ?? {}) as Change;
          const who = event.actorName ?? event.actorEmail ?? "Someone";
          const when = timeZone ? formatDateTimeIn(event.occurredAt, timeZone) : "";
          return (
            <li key={event.id} className="text-shamiri-text-grey">
              <span className="text-shamiri-black">{who}</span>{" "}
              {event.action === "ANSWER_CORRECTED" ? (
                <>
                  corrected <span className="text-shamiri-black">{show(before.value)}</span> to{" "}
                  <span className="text-shamiri-black">{show(after.value)}</span>
                </>
              ) : (
                <>
                  accepted <span className="text-shamiri-black">{show(after.value)}</span>
                </>
              )}
              {after.reviewStatus && (
                <span> ({SURVEY_ANSWER_REVIEW_STATUS_LABELS[after.reviewStatus]})</span>
              )}
              {when && <span className="ml-2 text-xs tabular-nums">{when}</span>}
            </li>
          );
        })}
      </ol>
    </details>
  );
}
