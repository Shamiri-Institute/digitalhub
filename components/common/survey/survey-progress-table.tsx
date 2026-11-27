import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import {
  PROGRESS_COUNTS,
  type ProgressCounts,
  progressTotals,
  type SurveyProgressRow,
} from "#/lib/survey/survey-progress";

const COUNT_HEADINGS: Record<keyof ProgressCounts, string> = {
  issued: "Printed",
  returned: "Scanned",
  missingPages: "Missing pages",
  needsReview: "Needs review",
  ready: "Ready",
  verified: "Verified",
};

/** Each school's copies of one survey, by how far they have come back, with a total. */
export function SurveyProgressTable({
  rows,
  showHub,
}: {
  rows: readonly SurveyProgressRow[];
  showHub: boolean;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-shamiri-text-grey">No copies have been printed yet.</p>;
  }
  const totals = progressTotals(rows);
  return (
    <Table aria-label="Progress by school">
      <TableHeader>
        <TableRow>
          {showHub && <TableHead>Hub</TableHead>}
          <TableHead>School</TableHead>
          {PROGRESS_COUNTS.map((count) => (
            <TableHead key={count} className="text-right">
              {COUNT_HEADINGS[count]}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((schoolProgress) => (
          <TableRow key={`${schoolProgress.hubId} ${schoolProgress.schoolId}`}>
            {showHub && <TableCell>{schoolProgress.hubName}</TableCell>}
            <TableCell>{schoolProgress.schoolName}</TableCell>
            {PROGRESS_COUNTS.map((count) => (
              <TableCell key={count} className="text-right tabular-nums">
                {schoolProgress[count]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
      <TableFooter className="bg-transparent font-semibold text-foreground">
        <TableRow>
          <TableCell colSpan={showHub ? 2 : 1}>Total</TableCell>
          {PROGRESS_COUNTS.map((count) => (
            <TableCell key={count} className="text-right tabular-nums">
              {totals[count]}
            </TableCell>
          ))}
        </TableRow>
      </TableFooter>
    </Table>
  );
}
