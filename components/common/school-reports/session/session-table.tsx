"use client";
import type { SessionReportType } from "#/app/(platform)/hc/reporting/school-reports/session/actions";
import ExpandableReportTable from "#/components/common/expandable-report-table";

import { columns, subColumns } from "./columns";

export default function SessionReportDataTable({
  sessionReport,
  canAddNotes = false,
}: {
  sessionReport: SessionReportType[];
  canAddNotes?: boolean;
}) {
  return (
    <ExpandableReportTable
      data={sessionReport}
      columns={columns}
      subColumns={subColumns(canAddNotes)}
      getSubRows={(row) => row.session}
      emptyStateMessage="No feedback data found"
      subEmptyStateMessage="No expenses found for this fellow"
      container={false}
    />
  );
}
