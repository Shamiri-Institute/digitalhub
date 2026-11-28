import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import type { SurveyViewer } from "#/lib/auth/survey-access";
import { formatDateTimeIn } from "#/lib/date-utils";
import { copyHref } from "#/lib/survey/copy/paths";
import type { CopyMissingPages } from "#/lib/survey/scan-pages/missing";

export function MissingPagesTable({
  copies,
  viewerKind,
  timeZone,
}: {
  copies: readonly CopyMissingPages[];
  viewerKind: SurveyViewer["kind"];
  /** Null until the browser has set the viewer's zone. */
  timeZone: string | null;
}) {
  if (copies.length === 0) {
    return (
      <p className="rounded-lg bg-muted px-4 py-8 text-center text-sm text-shamiri-text-grey">
        No copy is missing pages.
      </p>
    );
  }
  const showHub = viewerKind === "project";
  return (
    <Table aria-label="Copies missing pages">
      <TableHeader>
        <TableRow>
          <TableHead>Survey</TableHead>
          {showHub && <TableHead>Hub</TableHead>}
          <TableHead>School</TableHead>
          <TableHead>Copy</TableHead>
          <TableHead>Missing pages</TableHead>
          <TableHead>Last scan</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {copies.map((copy) => (
          <TableRow key={copy.id}>
            <TableCell>
              <span className="font-medium text-shamiri-black">{copy.survey.code}</span>{" "}
              <span className="text-shamiri-text-grey">{copy.survey.title}</span>
            </TableCell>
            {showHub && <TableCell>{copy.hubName}</TableCell>}
            <TableCell>{copy.schoolName}</TableCell>
            <TableCell>
              <Link
                href={copyHref(viewerKind, copy.id)}
                className="font-mono font-medium text-shamiri-new-blue tabular-nums underline-offset-4 hover:underline"
              >
                {copy.serial}
              </Link>
            </TableCell>
            <TableCell>
              <span className="font-medium text-shamiri-black">
                {copy.missingPages.map((page) => `P${page.pageNumber}`).join(", ")}
              </span>
              <span className="text-shamiri-text-grey tabular-nums">
                {" · "}
                {copy.printedPages - copy.missingPages.length} of {copy.printedPages} scanned
              </span>
            </TableCell>
            <TableCell className="text-shamiri-text-grey tabular-nums">
              {copy.lastScannedAt && timeZone ? formatDateTimeIn(copy.lastScannedAt, timeZone) : ""}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
