import { SURVEY_VERSION_PREFILL_LABELS } from "#/db/enums";
import { formatDateTimeIn } from "#/lib/date-utils";
import type { PrintRunCopies, PrintRunDetail } from "#/lib/survey/print-run-queries";
import { PrintFilesTable } from "./print-files-table";
import { PrintStatusBadge } from "./print-runs-table";
import { QuestionnairesTable } from "./questionnaires-table";

export function PrintRunDetailView({
  run,
  copies,
  runPath,
  timeZone,
}: {
  run: PrintRunDetail;
  /** The viewer's, from `viewerTimeZone()`; null until the browser has set it. */
  timeZone: string | null;
  copies: PrintRunCopies;
  runPath: string;
}) {
  const facts = [
    [
      "Survey",
      `${run.version.survey.title} (${run.version.survey.code}) v${run.version.versionNumber}`,
    ],
    ["Hub", run.hub.hubName],
    ["Copies", String(run.copyCount)],
    ["Serials", `${run.firstSerial} to ${run.lastSerial}`],
    ["Prints", run.version.prefill ? SURVEY_VERSION_PREFILL_LABELS[run.version.prefill] : ""],
    [
      "Created",
      [
        timeZone && formatDateTimeIn(run.createdAt, timeZone),
        `by ${run.requestedByUser.name ?? run.requestedByUser.email}`,
      ]
        .filter(Boolean)
        .join(" "),
    ],
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Print run</h2>
        <PrintStatusBadge status={run.status} />
      </div>
      <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
        {facts.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-shamiri-text-grey">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <section className="space-y-3">
        <h3 className="text-base font-semibold">Files to print</h3>
        <PrintFilesTable printRunId={run.id} files={run.files} runStatus={run.status} />
      </section>
      <section className="space-y-3">
        <h3 className="text-base font-semibold">Copies</h3>
        <QuestionnairesTable {...copies} prefill={run.version.prefill} runPath={runPath} />
      </section>
    </div>
  );
}

/** The page of copies the URL asks for; fetchPrintRunCopies clamps it to the run's last. */
export function copiesPageOf(searchParams: { page?: string | string[] }) {
  const page = Number(searchParams.page);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}
