import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { QuestionnaireStatusBadge } from "#/components/common/survey/questionnaire-status-badge";
import { SurveyAnswerReviewStatus, SurveyQuestionnaireStatus } from "#/db/enums";
import type { SurveyViewer } from "#/lib/auth/survey-access";
import { formatDateIn, formatDateTimeIn } from "#/lib/date-utils";
import { isSettledCopy } from "#/lib/survey/answer-fields";
import { SurveyAuditAction } from "#/lib/survey/audit";
import type {
  CopyAnswer,
  CopyHistoryEvent,
  CopyPage,
  CopyView,
  ShownPerson,
} from "#/lib/survey/copy/copy";
import { progressOf, refusalMessage } from "#/lib/survey/copy/decide";
import { printRunHref, reviewAnswerHref } from "#/lib/survey/copy/paths";
import { cn } from "#/lib/utils";
import { CopyReopenDialog, CopyVerifyDialog } from "./copy-actions";
import { CopyPageImage } from "./copy-page-image";

type ViewerKind = SurveyViewer["kind"];

export function CopyDetail({
  copy,
  viewerKind,
  timeZone,
}: {
  copy: CopyView;
  viewerKind: ViewerKind;
  /** Null until the browser has set the viewer's zone. */
  timeZone: string | null;
}) {
  const settled = isSettledCopy(copy.status);
  const headerFacts = [
    `${copy.survey.title} · v${copy.versionNumber}`,
    copy.hubName,
    copy.schoolName,
    copy.student && [copy.student.name, copy.student.admissionNumber].filter(Boolean).join(", "),
  ].filter(Boolean);
  return (
    <div className="space-y-6">
      <Link
        href={printRunHref(viewerKind, copy.survey.id, copy.printRun.id)}
        className="flex w-fit items-center gap-1 text-sm font-medium text-shamiri-new-blue hover:underline"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Print run{timeZone && ` ${formatDateIn(copy.printRun.createdAt, timeZone)}`}
      </Link>
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold text-shamiri-black tabular-nums">
            {copy.serial}
          </h1>
          <QuestionnaireStatusBadge status={settled ? copy.status : progressOf(copy.facts)} />
        </div>
        <p className="text-sm text-shamiri-text-grey">{headerFacts.join(" · ")}</p>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[2fr_minmax(18rem,1fr)]">
        <aside className="order-first space-y-4 lg:sticky lg:top-4 lg:order-last">
          <CopyState copy={copy} viewerKind={viewerKind} timeZone={timeZone} />
          <CopyHistory history={copy.history} timeZone={timeZone} />
        </aside>

        <div className="min-w-0 space-y-10">
          <nav aria-label="Pages" className="flex flex-wrap gap-2">
            {copy.pages.map((page) => (
              <a
                key={page.pageNumber}
                href={`#page-${page.pageNumber}`}
                className="inline-flex items-baseline gap-2 rounded-md border border-grey-border bg-white px-3 py-1.5 text-sm text-shamiri-black hover:bg-muted focus-visible:ring-2 focus-visible:ring-shamiri-new-blue focus-visible:outline-none"
              >
                Page {page.pageNumber}
                <PageStateWord page={page} settled={settled} />
              </a>
            ))}
          </nav>

          {copy.pages.map((page) => (
            <PrintedPage
              key={page.pageNumber}
              page={page}
              surveyId={copy.survey.id}
              viewerKind={viewerKind}
              settled={settled}
            />
          ))}

          {copy.rejectedScans.length > 0 && (
            <section className="space-y-4 border-t border-grey-border pt-8">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-shamiri-black">
                  Scans that arrived while this copy was verified
                </h2>
                <p className="text-sm text-shamiri-text-grey">
                  Kept for reference. Swapping one in for the current page isn&apos;t available yet.
                </p>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {copy.rejectedScans.map((scan) => (
                  <li key={scan.id} className="space-y-2">
                    <div className="rounded-lg bg-muted p-3">
                      <CopyPageImage
                        url={scan.image?.url ?? null}
                        alt={`A later scan of page ${scan.pageNumber}`}
                      />
                    </div>
                    <p className="text-sm">
                      <span className="font-medium text-shamiri-black">Page {scan.pageNumber}</span>
                      <span className="text-shamiri-text-grey">
                        {scan.fileName && ` · ${scan.fileName}`}
                        {timeZone && ` · ${formatDateTimeIn(scan.receivedAt, timeZone)}`}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function pageNeedsReview(page: CopyPage) {
  return page.answers.some(
    (answer) => answer.reviewStatus === SurveyAnswerReviewStatus.NEEDS_REVIEW,
  );
}

// A void or verified copy's answers leave the review queue, so its pages point nowhere to review.
function PageStateWord({ page, settled }: { page: CopyPage; settled: boolean }) {
  if (!page.scan) return <span className="text-xs text-shamiri-text-grey">not scanned</span>;
  if (pageNeedsReview(page)) {
    return settled ? (
      <span className="text-xs text-shamiri-text-grey">not reviewed</span>
    ) : (
      <span className="text-xs text-red-base">needs review</span>
    );
  }
  return <span className="text-xs text-shamiri-green">scanned</span>;
}

function PrintedPage({
  page,
  surveyId,
  viewerKind,
  settled,
}: {
  page: CopyPage;
  surveyId: string;
  viewerKind: ViewerKind;
  settled: boolean;
}) {
  return (
    <section id={`page-${page.pageNumber}`} className="scroll-mt-4 space-y-3">
      <h2 className="flex flex-wrap items-baseline gap-x-2 text-lg font-semibold text-shamiri-black">
        Page {page.pageNumber}
        <span className="font-mono text-sm font-normal text-shamiri-text-grey">{page.code}</span>
      </h2>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="rounded-lg bg-muted p-3">
          {page.scan ? (
            <CopyPageImage
              url={page.scan.image?.url ?? null}
              alt={`Page ${page.pageNumber} as scanned`}
              className="max-h-[80vh] w-auto"
            />
          ) : (
            <div className="flex aspect-[210/297] max-h-[80vh] w-full flex-col items-center justify-center gap-1 rounded-xs border border-dashed border-grey-border text-center">
              <p className="text-sm font-medium text-shamiri-black">Not scanned yet</p>
              <p className="font-mono text-xs text-shamiri-text-grey">{page.code}</p>
            </div>
          )}
        </div>
        {page.answers.length > 0 ? (
          <dl className="divide-y divide-grey-border">
            {page.answers.map((answer) => (
              <AnswerRow
                key={answer.id}
                answer={answer}
                reviewHref={settled ? null : reviewAnswerHref(viewerKind, surveyId, answer.id)}
              />
            ))}
          </dl>
        ) : (
          <p className="text-sm text-shamiri-text-grey">
            {page.scan ? "This page has no answers." : "Its answers appear once it is scanned."}
          </p>
        )}
      </div>
    </section>
  );
}

function AnswerRow({ answer, reviewHref }: { answer: CopyAnswer; reviewHref: string | null }) {
  return (
    <div className="space-y-0.5 py-2.5 first:pt-0">
      <dt className="text-sm text-shamiri-text-grey">
        {answer.rowLabel ? (
          <>
            <span className="text-shamiri-black">{answer.rowLabel}</span>
            <span className="block text-xs">{answer.prompt}</span>
          </>
        ) : (
          answer.prompt
        )}
      </dt>
      <dd className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span
          className={cn(
            "font-medium",
            answer.isBlank ? "text-shamiri-text-grey" : "text-shamiri-black",
          )}
        >
          {answer.valueText}
        </span>
        <ReviewWord answer={answer} reviewHref={reviewHref} />
      </dd>
    </div>
  );
}

function ReviewWord({ answer, reviewHref }: { answer: CopyAnswer; reviewHref: string | null }) {
  switch (answer.reviewStatus) {
    case SurveyAnswerReviewStatus.NEEDS_REVIEW:
      return reviewHref === null ? (
        <span className="text-xs text-shamiri-text-grey">Not reviewed</span>
      ) : (
        <Link
          href={reviewHref}
          className="text-xs font-medium text-red-base underline-offset-4 hover:underline"
        >
          Needs review
        </Link>
      );
    case SurveyAnswerReviewStatus.VERIFIED:
      return (
        <span className="text-xs text-shamiri-text-grey">
          Checked by {personWord(answer.reviewer)}
        </span>
      );
    case SurveyAnswerReviewStatus.CORRECTED:
      return (
        <span className="text-xs text-shamiri-text-grey">
          Corrected by {personWord(answer.reviewer)}
        </span>
      );
    case SurveyAnswerReviewStatus.AUTO_ACCEPTED:
      return null;
  }
}

function CopyState({
  copy,
  viewerKind,
  timeZone,
}: {
  copy: CopyView;
  viewerKind: ViewerKind;
  timeZone: string | null;
}) {
  const copyRef = { id: copy.id, serial: copy.serial };
  const latest = (eventAction: SurveyAuditAction) =>
    copy.history.find((event) => event.action === eventAction);
  const when = (date: Date) => (timeZone ? ` on ${formatDateIn(date, timeZone)}` : "");
  let body: ReactNode;
  if (copy.status === SurveyQuestionnaireStatus.VOID) {
    const voided = latest(SurveyAuditAction.QUESTIONNAIRE_VOIDED);
    body = <p>{voided?.reason ? `Voided: ${voided.reason}` : "This copy is void."}</p>;
  } else if (copy.status === SurveyQuestionnaireStatus.VERIFIED) {
    const verified = latest(SurveyAuditAction.QUESTIONNAIRE_VERIFIED);
    body = (
      <>
        <p>
          {verified
            ? `Verified by ${personWord(verified.actor)}${when(verified.occurredAt)}.`
            : "Verified."}{" "}
          Its answers are locked.
        </p>
        {copy.actions.reopen.kind === "change" ? (
          <CopyReopenDialog copy={copyRef} seenEventId={copy.history[0]?.id ?? null} />
        ) : (
          <p className="text-shamiri-text-grey">The Research team can reopen it.</p>
        )}
      </>
    );
  } else {
    const verify = copy.actions.verify;
    const [firstWaiting] = copy.answersNeedingReview;
    body =
      verify.kind === "change" ? (
        <>
          <p>Every page is scanned and every answer checked.</p>
          <CopyVerifyDialog copy={copyRef} seenEventId={copy.history[0]?.id ?? null} />
        </>
      ) : verify.kind === "refused" ? (
        <>
          <p>{refusalMessage(verify.refusal)}.</p>
          {verify.refusal.kind === "answers-need-review" && firstWaiting && (
            <Link
              href={reviewAnswerHref(viewerKind, copy.survey.id, firstWaiting.id)}
              className="inline-block font-medium text-shamiri-new-blue underline-offset-4 hover:underline"
            >
              Review them
            </Link>
          )}
        </>
      ) : null;
  }
  return (
    <section
      aria-label="Copy status"
      className="space-y-3 rounded-lg border border-grey-border bg-white p-4 text-sm text-shamiri-black"
    >
      {body}
    </section>
  );
}

const EVENT_WORDS: Partial<Record<string, string>> = {
  [SurveyAuditAction.QUESTIONNAIRE_VERIFIED]: "verified the copy",
  [SurveyAuditAction.QUESTIONNAIRE_REOPENED]: "reopened the copy",
  [SurveyAuditAction.QUESTIONNAIRE_VOIDED]: "voided the copy",
  [SurveyAuditAction.ANSWER_VERIFIED]: "accepted",
  [SurveyAuditAction.ANSWER_CORRECTED]: "corrected",
};

function CopyHistory({
  history,
  timeZone,
}: {
  history: CopyHistoryEvent[];
  timeZone: string | null;
}) {
  return (
    <section aria-labelledby="copy-history" className="space-y-3 rounded-lg bg-muted p-4 text-sm">
      <h2 id="copy-history" className="font-medium text-shamiri-black">
        History
      </h2>
      {history.length === 0 ? (
        <p className="text-shamiri-text-grey">Nothing has been reviewed or changed yet.</p>
      ) : (
        <ol className="max-h-[60vh] space-y-3 overflow-y-auto">
          {history.map((event) => (
            <li key={event.id} className="space-y-0.5">
              <p className="text-shamiri-text-grey">
                <span className="text-shamiri-black">
                  {personWord(event.actor, { startsSentence: true })}
                </span>{" "}
                {EVENT_WORDS[event.action] ?? event.action.toLowerCase()}
                {event.answerLabel && (
                  <span className="text-shamiri-black"> {event.answerLabel}</span>
                )}
              </p>
              {event.reason && <p className="text-shamiri-black">{event.reason}</p>}
              {timeZone && (
                <p className="text-xs text-shamiri-text-grey tabular-nums">
                  {formatDateTimeIn(event.occurredAt, timeZone)}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function personWord(person: ShownPerson, { startsSentence = false } = {}) {
  switch (person.kind) {
    case "viewer":
      return startsSentence ? "You" : "you";
    case "named":
      return person.name;
    case "unnamed":
      return startsSentence ? "Someone" : "someone";
  }
}
